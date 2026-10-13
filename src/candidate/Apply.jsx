import { useAuth } from '../auth/AuthContext';
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

const Apply = () => {
    const { user } = useAuth();
    const location = useLocation()
    const navigate = useNavigate()
    const job = location.state?.job

    const formRef = useRef(null);
    const [ file, setFile ] = useState(null);
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
    const isFormValid = Boolean(file && fullName && emailValid && phone && address && allMbtiAnswered);
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
            console.error("Error details:", err);
            console.error("Error response:", err.response);
            console.error("Error status:", err.response?.status);
            console.error("Error data:", err.response?.data);
            alert(err.response?.data?.message || "Error submitting application");
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
                                <p>Upload your Resume</p>
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
                                            onChange={(e) => setFile(e.target.files[0])}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className='contactContainer section' id='contact'>
                            <div className='contactTitle'><p>Contact Information</p></div>
                            <div className='nameInput'>
                                <label className='nameInputLabel'>Full Name</label>
                                <input type='text' className='nameInputBox' value={fullName} onChange={(e) => setFullName(e.target.value)}></input>
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
                                        onChange={setPhone}
                                    />
                                </div>
                            </div>
                            <div className='addressInput'>
                                <label className='addressInputLabel'>Address</label>
                                <input type='text' className='addressInputBox' value={address} onChange={(e) => setAddress(e.target.value)}></input>
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
