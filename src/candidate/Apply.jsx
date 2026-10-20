import { useAuth } from '../auth/AuthContext';
import INPUT_LIMITS from '../auth/inputLimits';
import React, { useState, useEffect, useRef } from 'react'
import Navbar from './components/Navbar/Navbar'
import MBTI from './components/MBTI/MBTI'
// import ApplyFooter from './components/footer/apply_footer'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import axios from "axios";
import './Apply.css'
import Stepper from "./components/Stepper/Stepper"
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const sectionIds = ["resume", "contact", "personality", "submit"];
const allowedResumeExtensions = ['.pdf', '.docx', '.doc', '.txt'];
const maxResumeSizeBytes = 10 * 1024 * 1024;

const Apply = () => {
    const { user } = useAuth();
    const location = useLocation()
    const navigate = useNavigate()
    const job = location.state?.job

    const formRef = useRef(null);
    const [ file, setFile ] = useState(null);
    const [ resumeError, setResumeError ] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState(user.email);
    const [address, setAddress] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [mbti, setMbti] = useState([]);
    // {mbti.join(";")}

    const [clearTrigger, setClearTrigger] = useState(false);

    const steps = [
        "Resume",
        "Contact Information",
        "Personality Questions",
        "Submit"
    ];

    const handleClearForm = () => {
        if (formRef.current) {
            formRef.current.reset(); // clears HTML inputs
        }
        // also reset React states
        setFile(null);
        setResumeError('');
        setFullName('');
        setEmail(user.email);
        setAddress('');
        setPhone('');
        setMbti([]);
        setClearTrigger(prev => !prev);
    };

    const calculatePersonalityType = (answers) => {
        if (!answers || answers.length === 0) return null;
        
        const counts = { A: 0, B: 0, C: 0, D: 0 };
        answers.forEach(answer => {
            if (answer) counts[answer]++;
        });
        
        const maxCount = Math.max(...Object.values(counts));
        const dominantTypes = Object.entries(counts)
            .filter(([_, count]) => count === maxCount)
            .map(([type, _]) => type)
            .sort();
        
        const typeMap = {
            'A': 'The Innovator',
            'B': 'The Organizer', 
            'C': 'The Connector',
            'D': 'The Adapter'
        };
        
        const hybridMap = {
            'AB': 'Creative Organizer',
            'AC': 'Friendly Innovator',
            'AD': 'Adaptive Dreamer',
            'BC': 'Strategic Connector',
            'BD': 'Practical Adapter',
            'CD': 'Social Explorer'
        };
        
        const rareMap = {
            'ABC': 'The Pathfinder',
            'ABD': 'The Trailblazer',
            'ACD': 'The Dreamweaver',
            'BCD': 'The Mediator'
        };
        
        if (dominantTypes.length === 1) {
            return typeMap[dominantTypes[0]];
        } else if (dominantTypes.length === 2) {
            const key = dominantTypes.join('');
            return hybridMap[key] || `${typeMap[dominantTypes[0]]} + ${typeMap[dominantTypes[1]]}`;
        } else if (dominantTypes.length === 3) {
            const key = dominantTypes.join('');
            return rareMap[key] || 'The Balanced Explorer';
        } else {
            return 'The Balanced Explorer';
        }
    };

    const allMbtiAnswered = mbti.length > 0 && mbti.every(Boolean);
    const emailValid = /.+@.+\..+/.test(email);
    const phoneDigits = phone.replace(/\D/g, '').length;
    const resumeExtension = file?.name?.slice(file.name.lastIndexOf('.')).toLowerCase();
    const resumeValid = Boolean(file && allowedResumeExtensions.includes(resumeExtension) && file.size <= maxResumeSizeBytes);
    const submitBlockers = [
        !file && 'Upload your resume.',
        file && !allowedResumeExtensions.includes(resumeExtension) && 'Use a PDF, DOCX, DOC, or TXT resume.',
        file && file.size > maxResumeSizeBytes && 'Your resume must be 10 MB or smaller.',
        !fullName.trim() && 'Enter your full name.',
        !emailValid && 'Your account email address is missing or invalid.',
        !phone && 'Enter your phone number.',
        !address.trim() && 'Enter your address.',
        !allMbtiAnswered && 'Answer all personality questions.'
    ].filter(Boolean);
    const isFormValid = submitBlockers.length === 0 && resumeValid;
    const personalityType = calculatePersonalityType(mbti);

    useEffect(() => {
    const sections = sectionIds.map(id => document.getElementById(id));

    const handleScroll = () => {
        let closestIndex = 0;
        let closestOffset = Infinity;

        sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        // distance from top of viewport (>= 0 so we only consider visible sections)
        const offset = Math.abs(rect.top);
        if (offset < closestOffset && rect.top < window.innerHeight) {
            closestOffset = offset;
            closestIndex = index;
        }
        });

        // If form is valid, always show Submit step as active
        if (isFormValid) {
            setCurrentStep(3); // Submit step (index 3)
        } else {
            setCurrentStep(closestIndex);
        }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // run once on mount

    return () => window.removeEventListener("scroll", handleScroll);
    }, [isFormValid]); // Add isFormValid as dependency

    const handleSubmit = async () => {
        if (!isFormValid) return;
        setResumeError('');
        
        console.log("Form validation passed, starting submission...");
        console.log("Form data:", {
            fullName,
            email,
            phone,
            address,
            mbti: mbti.join(";"),
            personality_type: personalityType,
            job_id: job.job_id,
            hasFile: !!file
        });
        
        try {
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("email", email);
            formData.append("phone", phone);
            formData.append("address", address);
            formData.append("mbti", mbti.join(";"));
            formData.append("personality_type", personalityType);
            formData.append("job_id", job.job_id);

            if (file) {
                formData.append("resume", file);  // 👈 this must match upload.single("resume")
            }

            console.log("Sending POST request to:", "/api/careers/applicants");
            
            const response = await axios.post("/api/careers/applicants", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            console.log("Response received:", response);
            alert("Application submitted!");
            handleClearForm();
            navigate('/application-success'); // Redirect to success page
        } catch (err) {
            const message = err.response?.data?.message || "We couldn't submit your application. Please try again.";
            setResumeError(message);
        }
    };

    const handleResumeChange = async (event) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(null);
        setResumeError('');
        if (!selectedFile) return;

        const extension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
        if (!allowedResumeExtensions.includes(extension)) {
            setResumeError('Upload a PDF, DOCX, DOC, or TXT resume.');
            event.target.value = '';
            return;
        }
        if (selectedFile.size > maxResumeSizeBytes) {
            setResumeError('Your resume must be 10 MB or smaller.');
            event.target.value = '';
            return;
        }

        try {
            const bytes = new Uint8Array(await selectedFile.arrayBuffer());
            const content = new TextDecoder('latin1').decode(bytes);
            let contentValid = false;
            if (extension === '.pdf') {
                const header = content.slice(0, 1024);
                const eof = content.lastIndexOf('%%EOF');
                const startXref = content.lastIndexOf('startxref', eof);
                const xref = content.lastIndexOf('xref', startXref);
                contentValid = bytes.length >= 100 && /%PDF-\d\.\d/.test(header)
                    && /(?:^|\s)\d+\s+\d+\s+obj(?:\s|\r|\n)/.test(content)
                    && xref >= 0 && startXref > xref && eof > startXref
                    && /^\d+$/.test(content.slice(startXref + 9, eof).trim());
            } else if (extension === '.doc') {
                const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
                contentValid = bytes.length >= 512 && signature.every((byte, index) => bytes[index] === byte)
                    && content.includes('W\0o\0r\0d\0D\0o\0c\0u\0m\0e\0n\0t\0');
            } else if (extension === '.docx') {
                contentValid = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
            } else if (extension === '.txt') {
                contentValid = !bytes.includes(0) && ![...bytes].some(byte => byte < 9 || (byte > 13 && byte < 32) || byte === 127);
                if (contentValid) {
                    try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
                    catch (_) { contentValid = false; }
                }
            }
            if (!contentValid) {
                setResumeError('The resume content does not match its file type. Upload a valid PDF, DOCX, DOC, or TXT file.');
                event.target.value = '';
                return;
            }
            setFile(selectedFile);
        } catch (_) {
            setResumeError('We could not read that file. Please choose another resume.');
            event.target.value = '';
        }
    };

    if (!job) return <Navigate to="/" replace />;

    return (
        <div>
            <Navbar/>
            <div className='container'>
                <div className='infoProgress'>
                    <Stepper steps={steps} currentStep={currentStep} sectionIds={sectionIds}/>
                </div>
                <div className='resumeContainer'>
                    <div className='jobTitle'>
                        <h1>Application for {job.job}</h1>
                    </div>
                    <form ref={formRef}>
                        <div className='resumeUploadContainer section' id='resume'>
                            <div className='resumeTitle'>
                                <p>Resume</p>
                            </div>
                            <div className='resumeDesc'>
                                <p>Upload your resume (PDF, DOC, DOCX, or TXT; maximum size 10 MB).</p>
                            </div>
                            <div className='uploadResume'>
                                <div>
                                    <span>{file ? file.name : "No file chosen"}</span>
                                </div>
                                <div>
                                    <label className="customFileButton">
                                        Choose File
                                        <input
                                            type="file"
                                            className="hiddenFileInput"
                                            accept=".pdf,.docx,.doc,.txt"
                                            onChange={handleResumeChange}
                                        />
                                    </label>
                                </div>
                            </div>
                            {resumeError && <p className="resumeError" role="alert">{resumeError}</p>}
                        </div>
                        <div className='contactContainer section' id='contact'>
                            <div className='contactTitle'><p>Contact Information</p></div>
                            <div className='nameInput'>
                                <label className='nameInputLabel'>Full Name</label>
                                <input type='text' className='nameInputBox' value={fullName} maxLength={INPUT_LIMITS.name} onChange={(e) => setFullName(e.target.value)}></input>
                                <small className="character-count">{fullName.length}/{INPUT_LIMITS.name} characters</small>
                            </div>
                            <div className='col'>
                                <div className='emailInput'>
                                    <label className='emailInputLabel'>Email</label>
                                    <input type='email' readOnly className='emailInputBox' value={email} onChange={(e) => setEmail(e.target.value)}></input>
                                </div>
                                <div className="phoneInput">
                                    <label className="phoneInputLabel">Phone Number</label>
                                    <PhoneInput  className='phoneInputBox'
                                        country={'my'} // default Malaysia
                                        value={phone}
                                        inputProps={{ required: true }}
                                        onChange={(value) => setPhone(value.replace(/\D/g, '').slice(0, INPUT_LIMITS.applicationPhone))}
                                    />
                                    <small className="character-count">{phoneDigits}/{INPUT_LIMITS.applicationPhone} digits</small>
                                </div>
                            </div>
                            <div className='addressInput'>
                                <label className='addressInputLabel'>Address</label>
                                <input type='text' className='addressInputBox' value={address} maxLength={INPUT_LIMITS.applicationAddress} onChange={(e) => setAddress(e.target.value)}></input>
                                <small className="character-count">{address.length}/{INPUT_LIMITS.applicationAddress} characters</small>
                            </div>
                        </div>
                        <div className='mbtiContainer section' id='personality'>
                            <div className='mbtiTitle'><p>Personality Questions</p></div>
                            <div><MBTI onAnswersChange={setMbti} clearTrigger={clearTrigger}/></div>
                        </div>

                        <div className='formActions section' id='submit'>
                            <div className='formActionsLeft'>
                                <a className='cancelBtn' href="/">Cancel</a>
                                <button type='button' className='clearBtn' onClick={handleClearForm}>Clear form</button>
                            </div>
                            <div className='formActionsRight'>
                                <button type='button' className='submitBtn' onClick={handleSubmit} disabled={!isFormValid}>Submit</button>
                                {submitBlockers.length > 0 ? (
                                    <div className="submitBlockers" role="status" aria-live="polite">
                                        <strong>To enable Submit:</strong>
                                        <ul>{submitBlockers.map(reason => <li key={reason}>{reason}</li>)}</ul>
                                    </div>
                                ) : <p className="submitReady" role="status">All required fields are complete. You can submit your application.</p>}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            {/* <ApplyFooter onClear={handleClearForm} onSubmit={handleSubmit}/> */}
        </div>
    );
}

export default Apply
