const fs = require('fs').promises;

/**
 * Simple PDF text extraction without external dependencies
 * This is a basic implementation that works for simple PDFs
 */
class SimplePDFParser {
    constructor() {
        this.textContent = '';
    }

    /**
     * Extract text from PDF using basic parsing
     */
    async extractText(pdfPath) {
        try {
            const buffer = await fs.readFile(pdfPath);
            return this.parsePDFBuffer(buffer);
        } catch (error) {
            console.error('Error reading PDF file:', error);
            return '';
        }
    }

    /**
     * Parse PDF buffer to extract text
     */
    parsePDFBuffer(buffer) {
        try {
            // Convert buffer to string and look for text patterns
            const content = buffer.toString('utf8');
            
            // Look for text objects in PDF
            const textMatches = content.match(/\(([^)]+)\)/g);
            if (textMatches) {
                return textMatches
                    .map(match => match.replace(/[()]/g, ''))
                    .filter(text => text.length > 2 && !text.match(/^[0-9\s]+$/))
                    .join(' ');
            }

            // Fallback: look for readable text patterns
            const readableText = content.match(/[a-zA-Z\s]{3,}/g);
            if (readableText) {
                return readableText
                    .filter(text => text.trim().length > 2)
                    .join(' ');
            }

            return '';
        } catch (error) {
            console.warn('PDF parsing failed:', error);
            return '';
        }
    }

    /**
     * Alternative method: extract text using regex patterns
     */
    extractTextWithRegex(buffer) {
        try {
            const content = buffer.toString('utf8');
            
            // Remove PDF metadata and binary content
            let text = content
                .replace(/\/[A-Za-z0-9]+\s+[0-9]+\s+R/g, '') // Remove PDF objects
                .replace(/[0-9]+\s+[0-9]+\s+obj/g, '') // Remove object references
                .replace(/endobj/g, '') // Remove endobj markers
                .replace(/stream[\s\S]*?endstream/g, '') // Remove stream content
                .replace(/[^\x20-\x7E\n\r\t]/g, '') // Keep only printable ASCII
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            // Extract meaningful text blocks
            const textBlocks = text.match(/[A-Za-z][^.]*\./g);
            if (textBlocks) {
                return textBlocks.join(' ');
            }

            return text;
        } catch (error) {
            console.warn('Regex PDF parsing failed:', error);
            return '';
        }
    }
}

module.exports = SimplePDFParser;
