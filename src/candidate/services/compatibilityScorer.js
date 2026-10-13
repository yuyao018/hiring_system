/**
 * Compatibility Scorer Module
 * 
 * This module provides functionality to evaluate the compatibility of a candidate's resume
 * against job requirements using enhanced rule-based methods and optional AI enhancements.
 * 
 * Key Features:
 * - Extracts text from various resume formats (PDF, DOCX, DOC, TXT).
 * - Uses advanced NLP techniques (TF-IDF, fuzzy matching) for skills and qualifications matching.
 * - Implements progressive score boosting based on education level, skill density, and content richness.
 * - Integrates with Hugging Face's sentence-transformers for semantic similarity scoring (if API key is provided).
 * - Provides detailed breakdown of scores across multiple categories.
 * 
 * Dependencies:
 * - natural: For NLP tasks like tokenization and TF-IDF.
 * - fs/promises: For file system operations.
 */

const natural = require('natural');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const mammoth = require('mammoth');

// Enhanced tokenizer and text processing
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

class CompatibilityScorer {
    constructor() {
        this.tokenizer = tokenizer;
        this.tfidf = new TfIdf();
        this.synonyms = this.initializeSynonyms();
    }

    /**
     * Initialize synonyms for better matching
     */
    initializeSynonyms() {
        return {
            // Programming Languages
            'javascript': ['js', 'ecmascript', 'node', 'react', 'angular', 'vue', 'jquery', 'es6', 'typescript'],
            'python': ['py', 'django', 'flask', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'fastapi'],
            'java': ['j2ee', 'spring', 'hibernate', 'maven', 'gradle', 'servlets', 'jsp', 'ejb', 'spring boot', 'spring mvc'],
            'c++': ['cpp', 'stl', 'boost', 'qt', 'opencv', 'templates', 'smart pointers'],
            'c#': ['csharp', 'dotnet', 'asp.net', 'entity framework', 'linq', 'wpf', 'winforms'],
            
            // Databases & SQL
            'sql': ['database', 'mysql', 'postgresql', 'oracle', 'mongodb', 'pl/sql', 't-sql', 'stored procedures', 'triggers', 'views'],
            'mysql': ['mariadb', 'innodb', 'myisam', 'replication', 'clustering'],
            'postgresql': ['postgres', 'pl/pgsql', 'jsonb', 'partitioning', 'streaming replication'],
            'mongodb': ['nosql', 'document database', 'aggregation pipeline', 'sharding', 'replica sets'],
            
            // Frameworks & Libraries
            'react': ['reactjs', 'react.js', 'frontend', 'ui', 'jsx', 'hooks', 'redux', 'context api'],
            'node': ['nodejs', 'node.js', 'backend', 'server', 'express', 'koa', 'nest.js'],
            'spring': ['spring boot', 'spring mvc', 'spring data', 'spring security', 'spring cloud'],
            'django': ['django rest framework', 'django orm', 'django admin', 'django channels'],
            'flask': ['flask-restful', 'flask-sqlalchemy', 'flask-migrate', 'blueprint'],
            
            // Cloud & DevOps
            'aws': ['amazon web services', 'ec2', 's3', 'lambda', 'rds', 'cloudformation', 'ecs', 'eks'],
            'azure': ['microsoft azure', 'app service', 'functions', 'cosmos db', 'aks', 'devops'],
            'docker': ['containerization', 'kubernetes', 'k8s', 'helm', 'docker-compose', 'microservices'],
            'kubernetes': ['k8s', 'container orchestration', 'pods', 'services', 'deployments', 'helm'],
            
            // Methodologies & Practices
            'agile': ['scrum', 'kanban', 'sprint', 'user stories', 'backlog', 'retrospective', 'daily standup'],
            'scrum': ['sprint planning', 'sprint review', 'sprint retrospective', 'product owner', 'scrum master'],
            'devops': ['ci/cd', 'continuous integration', 'continuous deployment', 'jenkins', 'gitlab ci', 'github actions'],
            'tdd': ['test driven development', 'unit testing', 'integration testing', 'junit', 'pytest', 'jest'],
            
            // Skills & Competencies
            'leadership': ['team lead', 'project manager', 'supervisor', 'manager', 'mentor', 'coach', 'director'],
            'problem solving': ['troubleshooting', 'debugging', 'analytical', 'critical thinking', 'root cause analysis', 'optimization'],
            'communication': ['presentation', 'writing', 'speaking', 'interpersonal', 'stakeholder management', 'documentation'],
            'project management': ['planning', 'coordination', 'risk management', 'resource allocation', 'timeline management'],
            
            // Data & AI
            'machine learning': ['ml', 'ai', 'artificial intelligence', 'deep learning', 'neural networks', 'supervised learning'],
            'data analysis': ['data science', 'statistics', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'tableau'],
            'big data': ['hadoop', 'spark', 'kafka', 'hive', 'hbase', 'distributed computing'],
            
            // Web Technologies
            'html': ['html5', 'semantic html', 'accessibility', 'seo'],
            'css': ['css3', 'sass', 'less', 'responsive design', 'flexbox', 'grid', 'bootstrap'],
            'rest': ['restful api', 'http', 'json', 'xml', 'soap', 'graphql', 'microservices'],
            'api': ['application programming interface', 'endpoints', 'authentication', 'authorization', 'rate limiting']
        };
    }

    /**
     * Extract text content from resume file
     */
    async extractResumeText(resumePath, originalFileName = null) {
        try {
            if (!resumePath) return '';
            
            console.log(`extractResumeText called with:`);
            console.log(`  resumePath: ${resumePath}`);
            console.log(`  originalFileName: ${originalFileName}`);
            
            // Use original filename to determine file type, fallback to temp path
            let fileExtension;
            if (originalFileName) {
                fileExtension = path.extname(originalFileName).toLowerCase();
                console.log(`Using original filename extension: ${fileExtension}`);
            } else {
                fileExtension = path.extname(resumePath).toLowerCase();
                console.log(`Using temp path extension: ${fileExtension}`);
            }
            
            console.log(`Final file extension determined: ${fileExtension}`);
            let text = '';

            if (fileExtension === '.pdf') {
                // Extract text from PDF
                text = await this.extractTextFromPDF(resumePath);
            } else if (fileExtension === '.docx') {
                // Extract text from DOCX
                text = await this.extractTextFromDOCX(resumePath);
            } else if (fileExtension === '.doc') {
                // Extract text from DOC (legacy format)
                text = await this.extractTextFromDOC(resumePath);
            } else if (fileExtension === '.txt') {
                // For text files, read directly
                text = await fs.readFile(resumePath, 'utf8');
            } else {
                console.warn(`Unsupported file format: ${fileExtension}`);
                return '';
            }

            return text.toLowerCase();
        } catch (error) {
            console.error('Error extracting resume text:', error);
            return '';
        }
    }

    /**
     * Extract text from DOCX files using mammoth
     */
    async extractTextFromDOCX(resumePath) {
        try {
            const buffer = await fs.readFile(resumePath);
            const result = await mammoth.extractRawText({ buffer });
            
            if (result.value) {
                return result.value;
            } else {
                console.warn('No text extracted from DOCX file');
                return '';
            }
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            return '';
        }
    }

    /**
     * Extract text from DOC files (legacy format)
     */
    async extractTextFromDOC(resumePath) {
        try {
            // Try to use mammoth for DOC files as well
            const buffer = await fs.readFile(resumePath);
            const result = await mammoth.extractRawText({ buffer });
            
            if (result.value) {
                return result.value;
            } else {
                // Fallback: try to read as text
                const text = await fs.readFile(resumePath, 'utf8');
                return text;
            }
        } catch (error) {
            console.warn('Error extracting text from DOC file:', error);
            // Try reading as plain text as last resort
            try {
                const text = await fs.readFile(resumePath, 'utf8');
                return text;
            } catch (fallbackError) {
                console.error('All DOC parsing methods failed:', fallbackError);
                return '';
            }
        }
    }

    /**
     * Simple PDF text extraction (fallback method)
     */
    async extractTextFromPDF(resumePath) {
        try {
            // Try to use our simple PDF parser first
            const SimplePDFParser = require('./simplePDFParser');
            const parser = new SimplePDFParser();
            let text = await parser.extractText(resumePath);
            
            // If simple parser didn't work well, try regex method
            if (!text || text.length < 50) {
                const buffer = await fs.readFile(resumePath);
                text = parser.extractTextWithRegex(buffer);
            }
            
            // If still no text, try pdf-parse as last resort
            if (!text || text.length < 50) {
                try {
                    const pdfParse = require('pdf-parse');
                    const dataBuffer = await fs.readFile(resumePath);
                    const data = await pdfParse(dataBuffer);
                    text = data.text;
                } catch (pdfError) {
                    console.warn('All PDF parsing methods failed:', pdfError);
                }
            }
            
            return text || '';
        } catch (error) {
            console.warn('PDF parsing failed completely:', error);
            return '';
        }
    }

    /**
     * Get job requirements from database
     */
    async getJobRequirements(jobId) {
        const { getJobRequirements: fetchJobRequirements } = require('../database/jobRequirements');
        return await fetchJobRequirements(jobId);
    }

    /**
     * Enhanced qualification matching based on education level hierarchy
     */
    calculateQualificationScore(resumeText, jobEducation) {
        // Safety check: if jobEducation is undefined, return default score
        if (!jobEducation) {
            console.warn('Job education requirement is undefined, using default qualification score');
            return {
                score: 0.5, // Default score when no education requirement specified
                isQualified: true, // Assume qualified if no requirement specified
                qualificationStatus: 'No Requirement Specified',
                highestDegree: 'Not Detected',
                jobRequirement: 'Not Specified',
                resumeLevel: 0,
                jobLevel: 0,
                levelDifference: 0
            };
        }

        // Define education level hierarchy (higher number = higher level)
        const educationLevels = {
            'none': 0,
            'certificate': 1,
            'diploma': 2,
            'bachelor': 3,
            'master': 4,
            'phd': 5,
            'doctorate': 5
        };

        // Detect highest degree level in resume
        const resumeLower = resumeText.toLowerCase();
        let highestDegree = 'none';
        let resumeLevel = 0;

        // Check for highest qualification in resume (order matters - check highest first)
        if (resumeLower.includes('phd') || resumeLower.includes('doctorate')) {
            highestDegree = 'PhD/Doctorate';
            resumeLevel = 5;
        } else if (resumeLower.includes('master')) {
            highestDegree = 'Master\'s';
            resumeLevel = 4;
        } else if (resumeLower.includes('bachelor')) {
            highestDegree = 'Bachelor\'s';
            resumeLevel = 3;
        } else if (resumeLower.includes('diploma')) {
            highestDegree = 'Diploma';
            resumeLevel = 2;
        } else if (resumeLower.includes('certificate')) {
            highestDegree = 'Certificate';
            resumeLevel = 1;
        }

        // Parse job education requirement
        const jobEducationLower = jobEducation.toLowerCase();
        let jobLevel = 0;
        let jobRequirement = 'Not Specified';

        if (jobEducationLower.includes('phd') || jobEducationLower.includes('doctorate')) {
            jobLevel = 5;
            jobRequirement = 'PhD/Doctorate';
        } else if (jobEducationLower.includes('master')) {
            jobLevel = 4;
            jobRequirement = 'Master\'s';
        } else if (jobEducationLower.includes('bachelor') || jobEducationLower.includes('degree')) {
            jobLevel = 3;
            jobRequirement = 'Bachelor\'s Degree';
        } else if (jobEducationLower.includes('diploma')) {
            jobLevel = 2;
            jobRequirement = 'Diploma';
        } else if (jobEducationLower.includes('certificate')) {
            jobLevel = 1;
            jobRequirement = 'Certificate';
        }

        // Determine qualification status
        let isQualified = false;
        let qualificationStatus = 'Not Qualified';
        let score = 0;

        if (resumeLevel >= jobLevel) {
            isQualified = true;
            qualificationStatus = 'Qualified';
            
            // Calculate score based on how much they exceed requirements
            if (resumeLevel > jobLevel) {
                qualificationStatus = 'Exceeds Requirements';
                score = 1.0; // Perfect score for exceeding
            } else {
                qualificationStatus = 'Meets Requirements';
                score = 0.9; // High score for meeting exactly
            }
        } else {
            isQualified = false;
            qualificationStatus = 'Below Requirements';
            score = 0.3; // Low score for not meeting requirements
        }

        return {
            score: Math.round(score * 100) / 100,
            isQualified: isQualified,
            qualificationStatus: qualificationStatus,
            highestDegree: highestDegree,
            jobRequirement: jobRequirement,
            resumeLevel: resumeLevel,
            jobLevel: jobLevel,
            levelDifference: resumeLevel - jobLevel
        };
    }

    /**
     * Enhanced skills matching with TF-IDF and synonyms
     */
    calculateSkillsScore(resumeText, jobSkills) {
        // Safety check: if jobSkills is undefined or empty, return default score
        if (!jobSkills || !Array.isArray(jobSkills) || jobSkills.length === 0) {
            console.warn('Job skills requirement is undefined or empty, using default skills score');
            return {
                score: 0.5, // Default score when no skills requirement specified
                matches: 0,
                totalSkills: 0,
                percentage: 0
            };
        }

        let score = 0;
        let matches = 0;
        const totalSkills = jobSkills.length;

        // Create TF-IDF for resume text
        this.tfidf.addDocument(resumeText);
        const resumeTerms = this.tfidf.listTerms(0);

        jobSkills.forEach(skill => {
            const skillLower = skill.toLowerCase();
            
            // Direct match
            if (resumeText.includes(skillLower)) {
                matches++;
                return;
            }

            // Check synonyms
            if (this.synonyms[skillLower]) {
                for (const synonym of this.synonyms[skillLower]) {
                    if (resumeText.includes(synonym)) {
                        matches++;
                        break;
                    }
                }
            }

            // TF-IDF based matching
            const skillWords = skillLower.split(/\s+/);
            for (const skillWord of skillWords) {
                if (resumeTerms.some(term => 
                    natural.JaroWinklerDistance(skillWord, term.term) > 0.7
                )) {
                    matches++;
                    break;
                }
            }
        });

        score = matches / totalSkills;
        return {
            score: Math.round(score * 100) / 100,
            matches: matches,
            totalSkills: totalSkills,
            percentage: Math.round((matches / totalSkills) * 100)
        };
    }

    /**
     * Enhanced CGPA score with multiple patterns
     */
    calculateGradesScore(resumeText) {
        let maxScore = 0;
        let actualGrade = null;
        let gradeType = 'none';

        // CGPA patterns (4.0 scale) - Primary focus
        const cgpaPatterns = [
            /(?:cgpa|cumulative grade point average)[:\s]*(\d+\.\d+)/i,
            /(\d+\.\d+)\s*(?:cgpa|cumulative grade point average)/i,
            /cgpa[:\s]*(\d+\.\d+)/i,
            /(?:gpa|grade point average)[:\s]*(\d+\.\d+)/i,
            /(\d+\.\d+)\s*(?:gpa|grade point average)/i,
            /gpa[:\s]*(\d+\.\d+)/i
        ];

        for (const pattern of cgpaPatterns) {
            const match = resumeText.match(pattern);
            if (match) {
                const cgpa = parseFloat(match[1]);
                if (cgpa >= 0 && cgpa <= 4.0) {
                    // Cap the score at 4.00 (100%)
                    const normalizedScore = Math.min(cgpa / 4.0, 1.0);
                    if (normalizedScore > maxScore) {
                        maxScore = normalizedScore;
                        actualGrade = cgpa;
                        gradeType = 'cgpa';
                    }
                }
            }
        }

        // Percentage grades (fallback)
        const percentagePattern = /(\d+)%/g;
        const percentages = [...resumeText.matchAll(percentagePattern)].map(m => parseInt(m[1]));
        
        if (percentages.length > 0) {
            const avgPercentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;
            if (avgPercentage >= 0 && avgPercentage <= 100) {
                const percentageScore = avgPercentage / 100;
                if (percentageScore > maxScore) {
                    maxScore = percentageScore;
                    actualGrade = avgPercentage;
                    gradeType = 'percentage';
                }
            }
        }

        // Letter grades (fallback)
        const letterGradePattern = /(?:grade|grade:)\s*([a-f][+-]?)/i;
        const letterMatch = resumeText.match(letterGradePattern);
        if (letterMatch) {
            const letterGrade = letterMatch[1].toUpperCase();
            const gradeScores = {
                'A+': 1.0, 'A': 0.95, 'A-': 0.90,
                'B+': 0.85, 'B': 0.80, 'B-': 0.75,
                'C+': 0.70, 'C': 0.65, 'C-': 0.60,
                'D+': 0.55, 'D': 0.50, 'D-': 0.45,
                'F': 0.30
            };
            if (gradeScores[letterGrade]) {
                const letterScore = gradeScores[letterGrade];
                if (letterScore > maxScore) {
                    maxScore = letterScore;
                    actualGrade = letterGrade;
                    gradeType = 'letter';
                }
            }
        }

        // If no grades found, return 0.3 instead of 0.5 to avoid penalizing
        // For CGPA values, preserve more precision to avoid rounding errors
        if (maxScore > 0) {
            // Check if this was a CGPA pattern match (more precise)
            const cgpaMatch = cgpaPatterns.some(pattern => pattern.test(resumeText));
            if (cgpaMatch) {
                // For CGPA, preserve 4 decimal places to maintain accuracy
                return {
                    score: Math.round(maxScore * 10000) / 10000,
                    actualGrade: actualGrade,
                    gradeType: gradeType
                };
            } else {
                // For other grade types, use 2 decimal places
                return {
                    score: Math.round(maxScore * 100) / 100,
                    actualGrade: actualGrade,
                    gradeType: gradeType
                };
            }
        }
        return {
            score: 0.3,
            actualGrade: 'Not Found',
            gradeType: 'none'
        };
    }

    /**
     * Enhanced achievements matching
     */
    calculateAchievementsScore(resumeText, jobAchievements) {
        // Safety check: if jobAchievements is undefined or empty, return default score
        if (!jobAchievements || !Array.isArray(jobAchievements) || jobAchievements.length === 0) {
            console.warn('Job achievements requirement is undefined or empty, using default achievements score');
            return {
                score: 0.5, // Default score when no achievements requirement specified
                matches: 0,
                totalAchievements: 0,
                actualCount: 0
            };
        }

        let score = 0;
        let matches = 0;
        const totalAchievements = jobAchievements.length;

        // Count actual achievement indicators found in resume
        const achievementIndicators = ['awarded', 'recognized', 'led', 'successfully', 'improved', 'reduced', 'increased', 'managed', 'supervised', 'mentored', 'trained', 'optimized', 'enhanced', 'streamlined', 'implemented', 'delivered', 'achieved', 'exceeded', 'outperformed', 'innovated'];
        const resumeLower = resumeText.toLowerCase();
        let actualAchievementCount = 0;
        
        achievementIndicators.forEach(indicator => {
            if (resumeLower.includes(indicator)) actualAchievementCount++;
        });

        jobAchievements.forEach(achievement => {
            const achievementLower = achievement.toLowerCase();
            
            // Direct match
            if (resumeText.includes(achievementLower)) {
                matches++;
                return;
            }

            // Check synonyms
            if (this.synonyms[achievementLower]) {
                for (const synonym of this.synonyms[achievementLower]) {
                    if (resumeText.includes(synonym)) {
                        matches++;
                        break;
                    }
                }
            }

            // Pattern matching for common achievement phrases
            const achievementPatterns = [
                /led\s+\d+\s+people/i,
                /managed\s+\d+\s+projects/i,
                /increased\s+(?:efficiency|productivity|sales)/i,
                /reduced\s+(?:costs|time|errors)/i,
                /awarded|honored|recognized/i
            ];

            for (const pattern of achievementPatterns) {
                if (pattern.test(resumeText)) {
                    matches++;
                    break;
                }
            }
        });

        score = matches / totalAchievements;
        return {
            score: Math.round(score * 100) / 100,
            matches: matches,
            totalAchievements: totalAchievements,
            actualCount: actualAchievementCount
        };
    }

    /**
     * Enhanced projects matching
     */
    calculateProjectsScore(resumeText, jobProjects) {
        // Safety check: if jobProjects is undefined or empty, return default score
        if (!jobProjects || !Array.isArray(jobProjects) || jobProjects.length === 0) {
            console.warn('Job projects requirement is undefined or empty, using default projects score');
            return {
                score: 0.5, // Default score when no projects requirement specified
                matches: 0,
                totalProjects: 0,
                actualCount: 0
            };
        }

        let score = 0;
        let matches = 0;
        const totalProjects = jobProjects.length;

        // Count actual project indicators found in resume
        const projectIndicators = ['built', 'developed', 'created', 'integrated', 'designed', 'implemented', 'architected', 'constructed', 'engineered', 'programmed', 'coded', 'assembled', 'configured', 'deployed', 'launched', 'maintained', 'upgraded', 'refactored', 'optimized', 'scaled'];
        const resumeLower = resumeText.toLowerCase();
        let actualProjectCount = 0;
        
        projectIndicators.forEach(indicator => {
            if (resumeLower.includes(indicator)) actualProjectCount++;
        });

        jobProjects.forEach(project => {
            const projectLower = project.toLowerCase();
            
            // Direct match
            if (resumeText.includes(projectLower)) {
                matches++;
                return;
            }

            // Check synonyms
            if (this.synonyms[projectLower]) {
                for (const synonym of this.synonyms[projectLower]) {
                    if (resumeText.includes(synonym)) {
                        matches++;
                        break;
                    }
                }
            }

            // Pattern matching for project descriptions
            const projectPatterns = [
                /developed|built|created|designed/i,
                /web\s+(?:application|site|app)/i,
                /mobile\s+(?:app|application)/i,
                /api|rest\s+api|backend/i,
                /database|sql|nosql/i
            ];

            for (const pattern of projectPatterns) {
                if (pattern.test(resumeText)) {
                    matches++;
                    break;
                }
                }
            });

        score = matches / totalProjects;
        return {
            score: Math.round(score * 100) / 100,
            matches: matches,
            totalProjects: totalProjects,
            actualCount: actualProjectCount
        };
    }

    /**
     * Boost qualification score based on education level matching
     */
    boostQualificationScore(aiScore, resumeText, jobQualifications) {
        let boost = aiScore;
        
        // Check for degree level matches with progressive boosting
        const degreeLevels = ['bachelor', 'master', 'phd', 'doctorate'];
        const resumeLower = resumeText.toLowerCase();
        
        // Check for advanced degrees in resume (regardless of job requirements)
        let advancedDegreeFound = false;
        let highestDegree = 'none';
        
        if (resumeLower.includes('phd') || resumeLower.includes('doctorate')) {
            highestDegree = 'phd';
            advancedDegreeFound = true;
            boost = Math.min(1.0, boost + 0.4); // PhD gets highest boost
        } else if (resumeLower.includes('master')) {
            highestDegree = 'master';
            advancedDegreeFound = true;
            boost = Math.min(1.0, boost + 0.3); // Master's gets high boost
        } else if (resumeLower.includes('bachelor')) {
            highestDegree = 'bachelor';
            boost = Math.min(1.0, boost + 0.2); // Bachelor's gets standard boost
        }
        
        // Additional boost for degree level matches with job requirements
        jobQualifications.forEach(qual => {
            const qualLower = qual.toLowerCase();
            degreeLevels.forEach(level => {
                if (qualLower.includes(level) && resumeLower.includes(level)) {
                    boost = Math.min(1.0, boost + 0.2); // Additional match boost
                }
            });
        });
        
        // Bonus boost for exceeding minimum requirements
        if (advancedDegreeFound) {
            boost = Math.min(1.0, boost + 0.15); // Bonus for exceeding minimum
        }
        
        return Math.max(0.4, Math.min(1.0, boost)); // Minimum 0.4, max 1.0
    }

    /**
     * Boost skills score based on technical skill density
     */
    boostSkillsScore(aiScore, resumeText, jobSkills) {
        let boost = aiScore;
        
        // Count technical skills mentioned in resume
        const technicalTerms = ['java', 'python', 'javascript', 'sql', 'database', 'api', 'react', 'flask', 'spring', 'node', 'mongodb', 'postgresql', 'mysql', 'docker', 'git', 'agile', 'scrum', 'rest', 'json', 'xml', 'html', 'css', 'typescript', 'angular', 'vue', 'django', 'express', 'hibernate', 'maven', 'gradle'];
        const resumeLower = resumeText.toLowerCase();
        let techSkillCount = 0;
        
        technicalTerms.forEach(term => {
            if (resumeLower.includes(term)) techSkillCount++;
        });
        
        // Progressive boosting based on skill count
        if (techSkillCount >= 10) boost += 0.4;        // 10+ skills: +0.4
        else if (techSkillCount >= 8) boost += 0.3;    // 8+ skills: +0.3
        else if (techSkillCount >= 6) boost += 0.25;   // 6+ skills: +0.25
        else if (techSkillCount >= 4) boost += 0.2;    // 4+ skills: +0.2
        else if (techSkillCount >= 2) boost += 0.15;   // 2+ skills: +0.15
        else if (techSkillCount >= 1) boost += 0.1;    // 1+ skill: +0.1
        
        return Math.max(0.4, Math.min(1.0, boost)); // Minimum 0.4, max 1.0
    }

    /**
     * Boost achievement score based on resume content richness
     */
    boostAchievementScore(aiScore, resumeText) {
        let boost = aiScore;
        
        // Check for achievement indicators
        const achievementIndicators = ['awarded', 'recognized', 'led', 'successfully', 'improved', 'reduced', 'increased', 'managed', 'supervised', 'mentored', 'trained', 'optimized', 'enhanced', 'streamlined', 'implemented', 'delivered', 'achieved', 'exceeded', 'outperformed', 'innovated'];
        const resumeLower = resumeText.toLowerCase();
        let achievementCount = 0;
        
        achievementIndicators.forEach(indicator => {
            if (resumeLower.includes(indicator)) achievementCount++;
        });
        
        // Progressive boosting based on achievement count
        if (achievementCount >= 8) boost += 0.4;        // 8+ achievements: +0.4
        else if (achievementCount >= 6) boost += 0.35;  // 6+ achievements: +0.35
        else if (achievementCount >= 4) boost += 0.3;   // 4+ achievements: +0.3
        else if (achievementCount >= 3) boost += 0.25;  // 3+ achievements: +0.25
        else if (achievementCount >= 2) boost += 0.2;   // 2+ achievements: +0.2
        else if (achievementCount >= 1) boost += 0.1;   // 1+ achievement: +0.1
        
        return Math.max(0.4, Math.min(1.0, boost)); // Minimum 0.4, max 1.0
    }

    /**
     * Boost project score based on technical project mentions
     */
    boostProjectScore(aiScore, resumeText, jobProjects) {
        let boost = aiScore;
        
        // Check for project indicators
        const projectIndicators = ['built', 'developed', 'created', 'integrated', 'designed', 'implemented', 'architected', 'constructed', 'engineered', 'programmed', 'coded', 'assembled', 'configured', 'deployed', 'launched', 'maintained', 'upgraded', 'refactored', 'optimized', 'scaled'];
        const resumeLower = resumeText.toLowerCase();
        let projectCount = 0;
        
        projectIndicators.forEach(indicator => {
            if (resumeLower.includes(indicator)) projectCount++;
        });
        
        // Progressive boosting based on project count
        if (projectCount >= 8) boost += 0.4;        // 8+ projects: +0.4
        else if (projectCount >= 6) boost += 0.35;  // 6+ projects: +0.35
        else if (projectCount >= 4) boost += 0.3;   // 4+ projects: +0.3
        else if (projectCount >= 3) boost += 0.25;  // 3+ projects: +0.25
        else if (projectCount >= 2) boost += 0.2;   // 2+ projects: +0.2
        else if (projectCount >= 1) boost += 0.1;   // 1+ project: +0.1
        
        return Math.max(0.4, Math.min(1.0, boost)); // Minimum 0.4, max 1.0
    }

    /**
     * AI enhancement using semantic similarity
     */
    async AIEnhancement(resumeText, jobRequirements) {
        try {
            // Use sentence-transformers for semantic similarity between resume and job requirements
            const response = await axios.post(
                'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
                {
                    inputs: {
                        "source_sentence": `Resume: ${resumeText.substring(0, 1000)}`,
                        "sentences": [
                            `Qualifications: ${jobRequirements.qualifications.join(', ')}`,
                            `Skills: ${jobRequirements.skills.join(', ')}`,
                            `Achievements: ${jobRequirements.achievements.join(', ')}`,
                            `Projects: ${jobRequirements.projects.join(', ')}`
                        ]
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || ''}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (response.data && Array.isArray(response.data)) {
                // response.data contains similarity scores [qualifications, skills, achievements, projects]
                const [qualificationScore, skillsScore, achievementsScore, projectsScore] = response.data;
                
                // Enhanced scoring logic with better score boosting
                let enhancedScores = {
                    // Boost qualification scores based on education level matching
                    qualification: this.boostQualificationScore(qualificationScore, resumeText, jobRequirements.qualifications),
                    // Boost skills scores based on technical skill density
                    skills: this.boostSkillsScore(skillsScore, resumeText, jobRequirements.skills),
                    // Grades are kept strictly rule-based - no AI alteration
                    grades: baseScores.grades.score, // Access the score property
                    // Boost achievement scores based on resume content richness
                    achievements: this.boostAchievementScore(achievementsScore, resumeText),
                    // Boost project scores based on technical project mentions
                    projects: this.boostProjectScore(projectsScore, resumeText, jobRequirements.projects)
                };

                console.log('AI Enhancement scores:', enhancedScores);
                return enhancedScores;
            }
        } catch (error) {
            console.log('Free AI enhancement not available, using rule-based scoring only');
            console.log('Error details:', error.message);
        }

        return null;
    }

    /**
     * Calculate overall compatibility score
     */
    async calculateCompatibilityScore(resumePath, jobId, originalFileName = null) {
        try {
            console.log(`calculateCompatibilityScore called with:`);
            console.log(`  resumePath: ${resumePath}`);
            console.log(`  jobId: ${jobId}`);
            console.log(`  originalFileName: ${originalFileName}`);
            
            // Extract resume text
            const resumeText = await this.extractResumeText(resumePath, originalFileName);
            if (!resumeText) {
                throw new Error('Could not extract text from resume');
            }

            // Get job requirements
            const jobRequirements = await this.getJobRequirements(jobId);
            
            // Debug: Log job requirements to see what we're getting
            console.log('Job Requirements received:', {
                education: jobRequirements.education,
                skills: jobRequirements.skills,
                achievements: jobRequirements.achievements,
                projects: jobRequirements.projects
            });

            // Calculate base scores
            const baseScores = {
                qualification: this.calculateQualificationScore(resumeText, jobRequirements.education),
                skills: this.calculateSkillsScore(resumeText, jobRequirements.skills),
                grades: this.calculateGradesScore(resumeText),
                achievements: this.calculateAchievementsScore(resumeText, jobRequirements.achievements),
                projects: this.calculateProjectsScore(resumeText, jobRequirements.projects)
            };

            // Extract actual values for detailed breakdown
            const actualValues = {
                qualification: baseScores.qualification.qualificationStatus,
                skills: `${baseScores.skills.percentage}% matches (${baseScores.skills.matches}/${baseScores.skills.totalSkills})`,
                grades: baseScores.grades.actualGrade,
                achievements: baseScores.achievements.actualCount,
                projects: baseScores.projects.actualCount
            };

            // AI enhancement using semantic similarity
            let finalScores = {
                qualification: baseScores.qualification.score,
                skills: baseScores.skills.score,
                grades: baseScores.grades.score,
                achievements: baseScores.achievements.score,
                projects: baseScores.projects.score
            };
            let aiScores = null;
            try {
                aiScores = await this.AIEnhancement(resumeText, jobRequirements);
                if (aiScores) {
                                    // Blend AI scores with base scores (60% AI, 40% base)
                // Grades are kept 100% rule-based - no AI influence
                // Qualifications are kept 100% rule-based for education level accuracy
                finalScores = {
                    qualification: baseScores.qualification.score, // 100% rule-based, no AI influence
                    skills: (aiScores.skills * 0.6) + (baseScores.skills.score * 0.4),
                    grades: baseScores.grades.score, // 100% rule-based, no AI influence
                    achievements: (aiScores.achievements * 0.6) + (baseScores.achievements.score * 0.4),
                    projects: (aiScores.projects * 0.6) + (baseScores.projects.score * 0.4)
                };
                }
            } catch (aiError) {
                console.log('AI enhancement not available, using enhanced rule-based scores only');
            }

            // Round all scores to 2 decimal places
            Object.keys(finalScores).forEach(key => {
                finalScores[key] = Math.round(finalScores[key] * 100) / 100;
            });

            // Calculate overall compatibility score (weighted average)
            const weights = {
                qualification: 0.25,
                skills: 0.30,
                grades: 0.15,
                achievements: 0.15,
                projects: 0.15
            };

            const overallScore = Object.keys(finalScores).reduce((total, key) => {
                return total + (finalScores[key] * weights[key]);
            }, 0);

            // Convert to integer score (0-100)
            const integerScore = Math.round(overallScore * 100);

            return {
                overallScore: integerScore, // Integer from 0-100
                breakdown: finalScores,
                detailedBreakdown: actualValues, // New detailed breakdown with actual values
                resumeText: resumeText.substring(0, 500), // First 500 chars for debugging
                method: aiScores ? 'Enhanced Rule-Based + Free AI' : 'Enhanced Rule-Based Only'
            };
        } catch (error) {
            console.error('Error calculating compatibility score:', error);
            throw error;
        }
    }
}

module.exports = CompatibilityScorer;
