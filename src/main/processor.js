const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const Fuse = require('fuse.js');
const { loadDatabase } = require('./database');

async function handleFileProcessing({ files, destination, ocrEnabled, moveAfterRename }, onProgress) {
  const employees = await loadDatabase('employees');
  const rules = await loadDatabase('rules');
  
  const fuse = new Fuse(employees, {
    keys: ['EmployeeName'],
    threshold: 0.4,
    includeScore: true
  });

  const results = [];
  let processedCount = 0;

  for (const filePath of files) {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);
    
    let ocrText = '';
    let ocrConfidence = 0;

    if (ocrEnabled && isImageOrPdf(ext)) {
      try {
        const worker = await createWorker('eng');
        const { data: { text, confidence } } = await worker.recognize(filePath);
        ocrText = text;
        ocrConfidence = confidence;
        await worker.terminate();
      } catch (err) {
        console.error('OCR Error:', err);
      }
    }

    // Matching
    const searchTarget = ocrText || fileName;
    const matchResults = fuse.search(searchTarget);
    let employee = null;
    let matchConfidence = 0;
    let issue = null;

    if (matchResults.length === 1) {
      employee = matchResults[0].item;
      matchConfidence = (1 - matchResults[0].score) * 100;
    } else if (matchResults.length > 1) {
      issue = 'Multiple employee matches';
    } else {
      issue = 'Employee not found';
    }

    // Classification
    let classification = 'Unclassified';
    let classConfidence = 0;
    
    if (employee && !issue) {
      const classResult = classifyDocument(ocrText || fileName, rules);
      classification = classResult.type;
      classConfidence = classResult.confidence;
      if (classConfidence < classResult.threshold) {
        issue = issue || 'Low classification confidence';
      }
    }

    // Renaming & Moving
    let newFileName = fileName;
    let status = 'Pending';
    
    if (employee && classification !== 'Unclassified' && !issue) {
      const sanitizedName = sanitizeName(employee.EmployeeName);
      const baseName = `${employee.EmployeeID}_${sanitizedName}_${classification}`;
      newFileName = getUniqueFileName(destination, baseName, ext);
      
      try {
        const destPath = path.join(destination, newFileName);
        if (moveAfterRename) {
          fs.renameSync(filePath, destPath);
        } else {
          fs.copyFileSync(filePath, destPath);
        }
        status = 'Completed';
      } catch (err) {
        status = 'Failed';
        issue = 'File system error';
      }
    } else {
      status = 'Flagged';
    }

    const result = {
      originalName: fileName,
      newName: newFileName,
      employee: employee ? employee.EmployeeName : 'Unknown',
      employeeId: employee ? employee.EmployeeID : 'N/A',
      classification,
      status,
      issue,
      ocrConfidence,
      matchConfidence,
      classConfidence,
      timestamp: new Date().toISOString()
    };

    results.push(result);
    processedCount++;
    onProgress({
      current: processedCount,
      total: files.length,
      lastResult: result
    });
  }

  return results;
}

function isImageOrPdf(ext) {
  return ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'].includes(ext.toLowerCase());
}

function classifyDocument(text, rules) {
  let bestMatch = { type: 'Unclassified', confidence: 0, threshold: 0 };
  const lowerText = text.toLowerCase();

  for (const rule of rules) {
    if (rule.Active !== 'true') continue;
    
    const keywords = rule.Keywords.split(',').map(k => k.trim().toLowerCase());
    const foundKeywords = keywords.filter(k => lowerText.includes(k));
    const confidence = (foundKeywords.length / keywords.length) * 100;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        type: rule.ClassificationType,
        confidence,
        threshold: parseFloat(rule.Threshold)
      };
    }
  }
  return bestMatch;
}

function sanitizeName(name) {
  return name.replace(/['",.()\[\]{}&@#%+=/:;<>\?]/g, '')
             .replace(/\s+/g, ' ')
             .replace(/\s/g, '');
}

function getUniqueFileName(dir, base, ext) {
  let fileName = `${base}${ext}`;
  let counter = 2;
  while (fs.existsSync(path.join(dir, fileName))) {
    fileName = `${base}_v${counter}${ext}`;
    counter++;
  }
  return fileName;
}

module.exports = { handleFileProcessing };
