const path = require('path');
const JSZip = require('jszip');
const mammoth = require('mammoth');

const unsupported = () => Object.assign(new Error('Resume content validation failed'), {
 status: 400,
 publicMessage: 'The resume content does not match its file type. Upload a valid PDF, DOCX, DOC, or TXT file.'
});

function isText(buffer) {
 if (!buffer.length || buffer.includes(0)) return false;
 try { new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
 catch (_) { return false; }
 for (const byte of buffer) {
  if ((byte < 9) || (byte > 13 && byte < 32) || byte === 127) return false;
 }
 return true;
}

async function validateResumeFile(file) {
 if (!file) return;
 const extension = path.extname(file.originalname).toLowerCase();
 const buffer = await require('fs/promises').readFile(file.path);
 let valid = false;

 if (extension === '.pdf') {
  // A filename or a pair of copied marker strings is not enough to make a PDF.
  // Require its header, at least one indirect object, a cross-reference section,
  // startxref pointer, and EOF marker in the expected order.
  const content = buffer.toString('latin1');
  const headerMatch = content.slice(0, 1024).match(/%PDF-\d\.\d/);
  const eofIndex = content.lastIndexOf('%%EOF');
  const startXrefIndex = content.lastIndexOf('startxref', eofIndex);
  const xrefIndex = content.lastIndexOf('xref', startXrefIndex);
  const objectMatch = content.match(/(?:^|\s)\d+\s+\d+\s+obj(?:\s|\r|\n)/);
  const startXrefValue = startXrefIndex >= 0
   ? content.slice(startXrefIndex + 'startxref'.length, eofIndex).trim()
   : '';
  valid = buffer.length >= 100
   && Boolean(headerMatch && objectMatch)
   && xrefIndex > objectMatch.index
   && startXrefIndex > xrefIndex
   && eofIndex > startXrefIndex
   && /^\d+$/.test(startXrefValue);
 } else if (extension === '.doc') {
  const oleHeader = Buffer.from('D0CF11E0A1B11AE1', 'hex');
  const wordStreamName = Buffer.from('WordDocument', 'utf16le');
  valid = buffer.length >= 512 && buffer.subarray(0, 8).equals(oleHeader) && buffer.includes(wordStreamName);
 } else if (extension === '.docx') {
  try {
   const archive = await JSZip.loadAsync(buffer);
   const entries = Object.values(archive.files);
   const expandedSize = entries.reduce((total, entry) => total + (entry._data?.uncompressedSize || 0), 0);
   const typesFile = archive.file('[Content_Types].xml');
   const documentFile = archive.file('word/document.xml');
   if (typesFile && documentFile && expandedSize <= 50 * 1024 * 1024
       && (documentFile._data?.uncompressedSize || 0) <= 20 * 1024 * 1024) {
    const [typesXml, documentXml] = await Promise.all([typesFile.async('string'), documentFile.async('string')]);
    const hasWordContentType = typesXml.includes('wordprocessingml.document.main+xml');
    const hasDocumentRoot = /<(?:[A-Za-z0-9_]+:)?document(?:\s|>)/.test(documentXml);
    if (hasWordContentType && hasDocumentRoot) {
     await mammoth.extractRawText({ buffer });
     valid = true;
    }
   }
  } catch (_) { valid = false; }
 } else if (extension === '.txt') {
  valid = isText(buffer);
 }

 if (!valid) throw unsupported();
}

module.exports = { validateResumeFile };
