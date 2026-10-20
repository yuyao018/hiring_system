import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar/Navbar'
import Selection from './components/Selection/Selection'
import Card from './components/Card/Card'
import { Link } from 'react-router-dom'
import Button from '@mui/material/Button'
import { FaDownload } from "react-icons/fa";
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper } from "@mui/material";
import './Dashboard.css'

const Dashboard = () => {
    const [jobs, setJobs] = useState([]);
    const [applicants, setApplicants] = useState([]);
    const [applicationError, setApplicationError] = useState('');
    const [selectedApplicantIndex, setSelectedApplicantIndex] = useState(null);
    const [animatedPercent, setAnimatedPercent] = useState(0);
    const applicationStatus = ["Reviewing", "Shortlisted", "Rejected"];
    const recruitment = ["My Recruitment", "All Recruitment"];
    const [selectedJob, setSelectedJob] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedRecruitment, setSelectedRecruitment] = useState("My Recruitment");
    const { user } = useAuth();
    const currentAdminId = user.id;

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await fetch("/api/recruiter/jobs"); // ✅ call backend API
                const data = await res.json();

                if (data.success) {
                    setJobs(data.jobs); // ✅ jobs come from backend
                } else {
                    console.error("Failed to fetch jobs");
                }
            } catch (error) {
                console.error("Error fetching jobs:", error);
            }
        };

        const fetchApplicants = async () => {
            try {
                const res = await fetch("/api/recruiter/applicants", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    setApplicants(data.applicants);
                } else {
                    setApplicationError("Unable to load applications right now. Please try again later.");
                }
            } catch (error) {
                console.error("Error fetching applicants:", error);
                setApplicationError("Unable to load applications right now. Please try again later.");
            }
        };



        fetchJobs();
        fetchApplicants();
    }, []);

    // Reset selected applicant when job filter changes
    useEffect(() => {
        setSelectedApplicantIndex(null);
    }, [selectedJob]);

    // Animate circular progress when selected applicant (or their score) changes
    useEffect(() => {
        const filtered = !selectedJob ? applicants : applicants.filter(a => a.job_name === selectedJob);
        const selected = selectedApplicantIndex === null ? null : filtered[selectedApplicantIndex];
        const target = selected ? Math.max(0, Math.min(100, Math.round(Number(selected.score) || 0))) : 0;

        let animationFrameId;
        let startTimestamp = null;
        const durationMs = 700;
        const startValue = animatedPercent;

        const step = (timestamp) => {
            if (startTimestamp === null) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
            const value = Math.round(startValue + (target - startValue) * progress);
            setAnimatedPercent(value);
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedApplicantIndex, selectedJob, applicants]);

    const formatDateTime = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        const datePart = date.toLocaleDateString();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${datePart} ${hours}:${minutes}`;
    };

    const handleUpdateApplicantStatus = async (applicantId, status) => {
        try {
            const response = await fetch(`/api/recruiter/updateApplicantStatus/${applicantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setApplicants(prev =>
                    prev.map(applicant =>
                        applicant.applicant_id === applicantId ? { ...applicant, status } : applicant
                    )
                );
                setApplicationError('');
            } else {
                setApplicationError("Unable to update this application. Please try again.");
            }
        } catch(error) {
            console.error("Error updating applicant status:", error);
            setApplicationError("Unable to update this application. Please try again.");
        }
    };

    const handleDeleteApplicant = async (applicant) => {
        if (!window.confirm(`Delete ${applicant.applicant_name}'s application? It will be removed from active review but retained in the audit history.`)) return;
        try {
            const response = await fetch(`/api/recruiter/applicants/${applicant.applicant_id}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete this application");
            setApplicants(prev => prev.filter(item => item.applicant_id !== applicant.applicant_id));
            setSelectedApplicantIndex(null);
            setApplicationError('');
        } catch (error) {
            setApplicationError("Unable to delete this application. Please try again.");
        }
    };

    return (
        <div>
            <Navbar/>
            <div className='headerContainer'>
                <div className='dashboardTitle'>
                    <h1>Dashboard</h1>
                </div>
                <div className='jobBtnGroup'>
                    <div className='manageJob'>
                        <Link to='/recruiter/manageJob'>Manage job</Link>
                    </div>
                    <div className='createJob'>
                        <Link to='/recruiter/form'>Create job</Link>
                    </div>
                </div>
            </div>
            {applicationError && <p role="alert" className="applicationError">{applicationError}</p>}
            <div className='recruiterTools'>
                <div className='jobs'>
                    <Selection
                        options={["All Jobs", ...jobs.map(job => job.job)]}
                        label="Job Title"
                        value={selectedJob || "All Jobs"}
                        onChange={(e) => setSelectedJob(e.target.value === "All Jobs" ? "" : e.target.value)}
                    />
                </div>
                <div className='applicationStatus'>
                    <Selection
                        options={applicationStatus}
                        label="Applicant Status"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    />
                </div>
                <div className='Recruitment'>
                    <Selection
                        options={recruitment}
                        label="Recruitment"
                        value={selectedRecruitment}
                        onChange={(e) => setSelectedRecruitment(e.target.value)}
                    />
                </div>
            </div>
            <div className='resumeContainer'>
                {(() => {
                    const filteredApplicants = applicants.filter(a => {
                    const admin_job = jobs.find(j => j.created_by === currentAdminId);
                    if (!admin_job) return false;
                    const matchApplicant = a.role_applied === admin_job.job_id;
                    const job = jobs.find(j => j.job_id === a.role_applied);
                    const jobMatch = !selectedJob || (job && job.job === selectedJob);
                    const recruitmentMatch =
                        selectedRecruitment === "All Recruitment" || matchApplicant;
                    const statusMatch = !selectedStatus || a.status === selectedStatus;
                    return jobMatch && recruitmentMatch && statusMatch;
                }); return (
                <div className='list'>
                    <h3>{filteredApplicants.length} Applicants</h3>
                    <div className='cardsWrapper'>
                        {filteredApplicants.length === 0 ? (
                            <p>No applicants found.</p>
                        ) : (
                            filteredApplicants
                                .map((applicant, index) => (
                                <div key={index} className='applicant-card-select' onClick={() => setSelectedApplicantIndex(index)}>
                                    <Card
                                        jobName={applicant.job_name || applicant.role_applied}
                                        applicantName={applicant.applicant_name}
                                        appliedAt={applicant.created_at}
                                    />
                                </div>
                                ))
                        )}
                    </div>
                </div>
                )})()}
                <div className='detail'>
                    {(() => {
                        const filtered = applicants.filter(a => {
                            const admin_job = jobs.find(j => j.created_by === currentAdminId);
                            if (!admin_job) return false;
                            const matchApplicant = a.role_applied === admin_job.job_id;
                            const job = jobs.find(j => j.job_id === a.role_applied);
                            const jobMatch = !selectedJob || (job && job.job === selectedJob);
                            const recruitmentMatch =
                                selectedRecruitment === "All Recruitment" || matchApplicant;
                            const statusMatch = !selectedStatus || a.status === selectedStatus;
                            return jobMatch && recruitmentMatch && statusMatch;
                        });

                        const selected = filtered[selectedApplicantIndex];

                        if (!selected) {
                            return (
                                <div className='noApplicantSelected'>
                                    <p>Please select an applicant ...</p>
                                </div>
                            );
                        }

                        let breakdown = null;
                        if (selected.compatibility_breakdown) {
                            try {
                                breakdown = typeof selected.compatibility_breakdown === 'string'
                                    ? JSON.parse(selected.compatibility_breakdown)
                                    : selected.compatibility_breakdown;
                                console.log('Parsed Breakdown:', breakdown);
                            } catch (error) {
                                console.error('Error parsing compatibility breakdown:', error);
                                breakdown = null;
                            }
                        } else {
                            console.log('No compatibility breakdown found');
                        }

                        // Debug: Log the selected applicant data
                        console.log('Selected Applicant:', selected);
                        console.log('Compatibility Breakdown Raw:', selected.compatibility_breakdown);
                        console.log('Compatibility Score:', selected.score);

                        return (
                            <>
                                <div className='buttonGroup'>
                                    <Button variant='outlined' color='success' className='shortlistBtn' onClick={() => handleUpdateApplicantStatus(selected.applicant_id, "Shortlisted")}>Shortlist</Button>
                                    <Button variant='outlined' color='error' className='RejectBtn' onClick={() => handleUpdateApplicantStatus(selected.applicant_id, "Rejected")}>Reject</Button>
                                    <Button variant='outlined' color='error' onClick={() => handleDeleteApplicant(selected)}>Delete application</Button>
                                </div>

                                <div className='applicantInfo'>
                                    <div className='applicantInfo-grid1'>
                                        <h3>{String(selected.applicant_name)} <span className={`applicantInfo-status ${selected.status}`}>{String(selected.status)}</span></h3>
                                        <p>{String(selected.job_name)}</p>
                                    </div>
                                    <div className='applicantInfo-grid2'>
                                        <p><strong>Applied on</strong><br/>{String(formatDateTime(selected.created_at))}</p>
                                    </div>
                                </div>

                                <div className='resultContainer'>
                                    <div className='score'>
                                        <h4 className='score-section'>Total Score</h4>
                                        <div className='circular' role='img' aria-label={`Compatibility score ${animatedPercent}%`}>
                                            <svg viewBox='0 0 100 100' aria-hidden='true' focusable='false'>
                                                <defs>
                                                    <linearGradient id='compatibility-gradient' x1='0' y1='0' x2='1' y2='1'>
                                                        <stop offset='0%' stopColor='#AE00FB' />
                                                        <stop offset='100%' stopColor='#3E00FF' />
                                                    </linearGradient>
                                                </defs>
                                                <circle className='circular-track' cx='50' cy='50' r='46.4' />
                                                <circle
                                                    className='circular-value'
                                                    cx='50'
                                                    cy='50'
                                                    r='46.4'
                                                    strokeDasharray='291.54'
                                                    strokeDashoffset={291.54 * (1 - animatedPercent / 100)}
                                                />
                                            </svg>
                                            <span aria-hidden='true'>{animatedPercent}%</span>
                                        </div>
                                    </div>

                                    <div className='breakdown'>
                                        <h4 className='breakdown-section'>Compatibility Breakdown</h4>
                                        <TableContainer component={Paper} sx={{ maxWidth: 600, margin: "auto", mt: 2, boxShadow: "none" }}>
                                            <Table size='small' sx={{ width: "100%" }}>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell><strong>Personality Type</strong></TableCell>
                                                        <TableCell>{selected.personality_type || "N/A"}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell><strong>Qualification Score</strong></TableCell>
                                                        <TableCell>{breakdown?.qualification || "N/A"}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell><strong>Skills Score</strong></TableCell>
                                                        <TableCell>{breakdown?.skills || "N/A"}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell><strong>Grades Score</strong></TableCell>
                                                        <TableCell>{breakdown?.grades || "N/A"}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell><strong>Achievements Score</strong></TableCell>
                                                        <TableCell>{breakdown?.achievements || "N/A"}</TableCell>
                                                    </TableRow>

                                                    <TableRow>
                                                        <TableCell><strong>Projects Score</strong></TableCell>
                                                        <TableCell>{breakdown?.projects || "N/A"}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </div>
                                </div>

                                <div className='contactInfo'>
                                    <h4 className='contactInfo-section'>Applicant's Contact Information</h4>
                                    <TableContainer component={Paper} sx={{ maxWidth: "100%", margin: "auto", mt: 1, boxShadow: "none" }}>
                                        <Table sx={{ width: "100%" }}>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell sx={{ width: "25%" }}><strong>Contact Number</strong></TableCell>
                                                    <TableCell sx={{ width: "75%" }}>+{String(selected.contact_number)}</TableCell>
                                                </TableRow>

                                                <TableRow>
                                                    <TableCell sx={{ width: "25%" }}><strong>Email Address</strong></TableCell>
                                                    <TableCell sx={{ width: "75%" }}><a href={`mailto:${String(selected.email)}`}>{String(selected.email)}</a></TableCell>
                                                </TableRow>

                                                <TableRow>
                                                    <TableCell sx={{ width: "25%" }}><strong>House Address</strong></TableCell>
                                                    <TableCell sx={{ width: "75%" }}>{String(selected.address)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </div>

                                <div className='resumeDownload'>
                                    <div className='resumeDownload-p'>
                                        <p>For more information, click to download Applicant's Resume</p>
                                    </div>
                                    <div>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={<FaDownload />}
                                            href={`/api/recruiter/resume/${selected.applicant_id}`}
                                            download
                                        >
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
