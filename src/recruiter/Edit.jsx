import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar/Navbar'
import { useParams } from 'react-router-dom'
import Selection from './components/Selection/Selection'
import { FaPlus, FaTrash } from "react-icons/fa"
import Button from "@mui/material/Button"
import './Edit.css'

export const Edit = () => {
    const { jobId } = useParams();
    const jobType = ["Full-time", "Part-time", "Intern"];
    const experience = ["No experience", "Fresh Graduates", "1+ year", "2–3 years", "3–5 years", "5+ years"]

    const [formData, setFormData] = useState({
        job_title: '',
        job_type: '',
        education: '',
        experience: '',
        overview: ''
    });

    const [requirements, setRequirements] = useState([""]);
    const [loading, setLoading] = useState(true);

    // Fetch job details by jobId
    useEffect(() => {
        const fetchJob = async () => {
            try {
                const response = await fetch(`/api/recruiter/editJob/${jobId}`);
                const data = await response.json();

                if (data.success && data.job) {
                    const job = data.job;
                    setFormData({
                        job_title: job.job || '',
                        job_type: job.job_type || '',
                        education: job.education || '',
                        experience: job.experience || '',
                        overview: job.description || ''
                    });
                    setRequirements(
                        job.requirement
                            ? job.requirement.split(";").map(r => r.trim())
                            : [""]
                    );
                } else {
                    console.error("Failed to load job data");
                }
            } catch (error) {
                console.error("Error fetching job:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [jobId]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addRequirement = () => setRequirements(prev => [...prev, ""]);
    const removeRequirement = (index) => setRequirements(prev => prev.filter((_, i) => i !== index));
    const updateRequirement = (index, value) => setRequirements(prev => prev.map((v, i) => i === index ? value : v));

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const updatedJob = {
                ...formData,
                requirements: requirements.filter(r => r.trim()).join("; ")
            };

            const response = await fetch(`/api/recruiter/updateJob/${jobId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedJob)
            });

            const result = await response.json();
            if (result.success) {
                alert("Job updated successfully!");
            } else {
                alert("Failed to update job");
            }
        } catch (error) {
            console.error("Error updating job:", error);
        }
    };

    if (loading) return <p>Loading job...</p>;

    return (
        <div>
            <Navbar/>
            <div className='editContainer'>
                <h2 className='formTitle'>Edit Job</h2>
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
                        <Button variant='contained' onClick={(e) => handleSave(e)}>Save</Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Edit