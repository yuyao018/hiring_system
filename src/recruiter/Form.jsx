import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import Selection from './components/Selection/Selection'
import { FaPlus, FaTrash } from "react-icons/fa"
import Button from "@mui/material/Button"
import './Form.css'

const Form = () => {
    const jobType = ["Full-time", "Part-time", "Intern"];
    const experience = ["No experience", "Fresh Graduates", "1+ year", "2–3 years", "3–5 years", "5+ years"]
    const [requirements, setRequirements] = useState([""]);
    const [formData, setFormData] = useState({
        job_title: '',
        job_type: '',
        education: '',
        experience: '',
        overview: ''
    });

    const addRequirement = () => setRequirements(prev => [...prev, ""]);
    const removeRequirement = (index) => setRequirements(prev => prev.filter((_, i) => i !== index));
    const updateRequirement = (index, value) => setRequirements(prev => prev.map((v, i) => i === index ? value : v));

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e, status) => {
        e.preventDefault();

        // Check if required fields are filled
        if (!formData.job_title || !formData.education || !formData.overview) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const jobData = {
                job_title: formData.job_title,
                job_type: formData.job_type,
                education: formData.education,
                experience: formData.experience,
                overview: formData.overview,
                requirements: requirements.filter(req => req.trim()), // Remove empty requirements
                status: status,
            };

            console.log('Sending job data:', jobData);

            const response = await fetch('/api/recruiter/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jobData)
            });

            const result = await response.json();
            console.log('Response:', result);
            
            if (result.success) {
                alert(`Job ${status === "Draft" ? "saved as draft" : "published"} successfully!`);
                // Reset form
                setFormData({
                    job_title: '',
                    job_type: '',
                    education: '',
                    experience: '',
                    overview: ''
                });
                setRequirements(['']);
            } else {
                alert(`Failed to create job: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating job:', error);
            alert('Error creating job: ' + error.message);
        }
    };

    return (
        <div>
            <Navbar/>
            <div className='formContainer'>
                <h2 className='formTitle'>Create Job for</h2>
                <form>
                    <div className='row'>
                        <div className='jobTitleInput'>
                            <label htmlFor="jobTitle" className='jobTitleLabel'>Job Title</label><br />
                            <input 
                                type="text" 
                                id="jobTitle" 
                                className='jobTitleBox'
                                value={formData.job_title}
                                onChange={(e) => handleInputChange('job_title', e.target.value)}
                                required
                            />
                        </div>
                        <div className='jobTypeInput'>
                            <Selection 
                                options={jobType} 
                                label="Job Type"
                                value={formData.job_type}
                                onChange={(e) => handleInputChange('job_type', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='row'>
                        <div className='educationInput'>
                            <label htmlFor="educationTitle" className='educationTitleLabel'>Education Qualification</label><br />
                            <input 
                                type="text" 
                                id="educationTitle" 
                                className='educationTitleBox'
                                value={formData.education}
                                onChange={(e) => handleInputChange('education', e.target.value)}
                                required
                            />
                        </div>
                        <div className='experienceInput'>
                            <Selection 
                                options={experience} 
                                label="Experience Required"
                                value={formData.experience}
                                onChange={(e) => handleInputChange('experience', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='overviewInput'>
                        <label htmlFor="overviewTitle" className='overviewTitleLabel'>Role Overview</label><br />
                        <textarea 
                            id="overviewTitle" 
                            className='overviewTitleBox' 
                            rows="5" 
                            cols="180"
                            value={formData.overview}
                            onChange={(e) => handleInputChange('overview', e.target.value)}
                            required
                        />
                    </div>
                    <div className='requirementInput'>
                        <div className='requirementHeader'>
                            <label htmlFor="requirementTitle" className='requirementTitleLabel'>Requirements</label>
                            <button type='button' className='addRequirementBtn' onClick={addRequirement} aria-label='Add requirement'><FaPlus/></button>
                        </div>
                        {requirements.map((value, idx) => (
                            <div className='requirementRow' key={idx}>
                                <input
                                    type="text"
                                    id={`requirementTitle-${idx}`}
                                    className='requirementTitleBox'
                                    value={value}
                                    onChange={(e) => updateRequirement(idx, e.target.value)}
                                    placeholder="Enter a requirement"
                                />
                                <button type='button' className='removeRequirementBtn' onClick={() => removeRequirement(idx)} aria-label='Remove requirement'>
                                    <FaTrash/>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className='formBtn'>
                        <Button variant='outlined' color='warning' onClick={(e) => handleSubmit(e, "Draft")}>Draft</Button>
                        <Button variant='contained' onClick={(e) => handleSubmit(e, "Active")}>Publish</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Form