import { useAuth } from '../auth/AuthContext';
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar'
import Selection from './components/Selection/Selection'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import './Managejob.css'

const Managejob = () => {
    const jobStatus = ["Active", "Closed", "Draft"]
    const recruitment = ["My Recruitment", "All Recruitment"];
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedRecruitment, setSelectedRecruitment] = useState("My Recruitment");
    const { user } = useAuth();
    const currentAdminId = user.id;

    const navigate = useNavigate();

    useEffect(() => {
        const fetchJobsData = async () => {
            try {
                const response = await fetch("/api/recruiter/allJobs");
                const data = await response.json();

                if (data.success) {
                    setJobs(data.jobs);
                } else {
                    console.error("Failed to fetch jobs");
                }
            } catch (error) {
                console.log("Error fetching jobs:", error);
            } finally {
                setLoading(false);
            }
        };



        fetchJobsData();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Filter jobs based on selected status and recruitment
    const filteredJobs = jobs.filter(job => {
        // Status filter
        const statusMatch = !selectedStatus || job.status === selectedStatus;
        
        // Recruitment filter
        let recruitmentMatch = true;
        if (selectedRecruitment === "My Recruitment") {
            recruitmentMatch = job.created_by === currentAdminId;
        } else if (selectedRecruitment === "All Recruitment") {
            recruitmentMatch = true; // Show all jobs
        }
        
        return statusMatch && recruitmentMatch;
    });

    const handleUpdateStatus = async (jobId, status) => {
        const response = await fetch(`/api/recruiter/updateStatus/${jobId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });
        const data = await response.json();
        if (data.success) {
            setJobs(prev =>
                prev.map(job =>
                    job.job_id === jobId ? { ...job, status } : job
                )
            );
        }
    };

    return (
        <div>
            <Navbar/>
            <div className='manageJobContainer'>
                <div className='manageJobSelection'>
                    <div className='jobStatus'>
                        <Selection
                            options={jobStatus}
                            label="Status"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        />
                    </div>
                    <div className='recruitment'>
                        <Selection
                            options={recruitment}
                            label="Recruitment"
                            value={selectedRecruitment}
                            onChange={(e) => setSelectedRecruitment(e.target.value)}
                        />
                    </div>
                </div>
                <div className='manageJobTable'>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                        <TableContainer sx={{ maxHeight: 440 }}>
                            <Table stickyHeader aria-label="jobs table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Job ID</TableCell>
                                        <TableCell>Job Name</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Created Date</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">Loading jobs...</TableCell>
                                        </TableRow>
                                    ) : jobs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">No jobs found</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredJobs.map((job, index) => (
                                            <TableRow
                                            key={index}
                                            hover
                                            style={{ cursor: "pointer" }}
                                            onClick={() => navigate(`/recruiter/edit/${job.job_id}`)}
                                            >
                                                <TableCell>{job.job_id || 'N/A'}</TableCell>
                                                <TableCell>{job.job || 'N/A'}</TableCell>
                                                <TableCell className={`status-cell ${job.status?.toLowerCase() || ''}`}>
                                                    <span className='status'>{job.status || 'N/A'}</span>
                                                </TableCell>
                                                <TableCell>{formatDate(job.created_at)}</TableCell>
                                                <TableCell>
                                                    <button
                                                    className='publishBtn'
                                                    disabled={job.status !== "Draft"}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // prevent row click navigation
                                                        handleUpdateStatus(job.job_id, "Active");
                                                    }}
                                                    >
                                                        Publish
                                                    </button>
                                                    <button
                                                    className='closeBtn'
                                                    disabled={job.status !== "Active"}
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // prevent row click navigation
                                                        handleUpdateStatus(job.job_id, "Closed");
                                                    }}
                                                    >
                                                        Close
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </div>
            </div>
        </div>
    )
}

export default Managejob