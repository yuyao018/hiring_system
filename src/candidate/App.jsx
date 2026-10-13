import { dashboardFor, useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar/Navbar'
import Card from './components/Card/Card'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Careers = () => {
  const [selectedJob, setSelectedJob] = useState(null)
  const navigate = useNavigate()
  const { user, loading } = useAuth();

  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    axios.get("/api/careers/jobs")
      .then(res => {
        console.log("Jobs data received:", res.data); // Debug log
        setJobs(res.data);
      })
      .catch(err => console.error(err));
  }, []);

  const renderList = (text) => {
    if (!text) return null;
    const items = String(text)
      .split(";")
      .map(i => i.trim())
      .filter(Boolean);
    if (items.length === 0) return null;
    return (
      <ul>
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    );
  };

  return (
    <div>
      <Navbar/>
      <h1 id='title'>Join Our Team</h1>
      <div className="pageContainer">
        <div className="jobsContainer">
          <h3>{jobs.length} jobs</h3>
          <div className="cardsWrapper">
            {jobs.map(job => (
              <div key={job.job_id} onClick={() => setSelectedJob(job)}>
                <Card key={job.job_id} title={job.job} type={job.job_type} experience={job.experience} postedAt={job.created_at} selected={selectedJob && selectedJob.job_id === job.job_id} />
              </div>
            ))}
          </div>
        </div>

        <div className="detailContainer">
            {selectedJob ? (
              <div>
                <div className='jobTitleRow'>
                  <div className='jobName'><h1>{selectedJob.job}</h1></div>
                  <div>
                    <button className='applyBtn' disabled={loading} onClick={() => {
                      if (!user) navigate('/login', { state: { from: { pathname: '/apply', state: { job: selectedJob } } } });
                      else if (user.role === 'applicant') navigate('/apply', { state: { job: selectedJob } });
                      else navigate(dashboardFor(user));
                    }}>
                      {loading ? 'Checking account...' : !user ? 'Sign in to apply' : user.role === 'applicant' ? 'Apply now' : 'Hiring dashboard'}
                    </button>
                  </div>
                </div>
                <div className='jobMeta'>
                  {selectedJob.job_type ? <span className='meta-badge'>{selectedJob.job_type}</span> : null}
                  {selectedJob.experience ? <span className='meta-badge'>{selectedJob.experience} experience</span> : null}
                  {selectedJob.created_at ? <span className='meta-time'>Posted {selectedJob.created_at}</span> : null}
                </div>
                <div className='divider'></div>

                {selectedJob.description ? (
                  <>
                    <h3>Role overview</h3>
                    <p>{selectedJob.description}</p>
                  </>
                ) : null}

                {selectedJob.requirement ? (
                  <>
                    <h3>Requirements</h3>
                    {renderList(selectedJob.requirement)}
                  </>
                ) : null}

                {selectedJob.education ? (
                  <>
                    <h3>Minimum qualification</h3>
                    <p>{selectedJob.education}</p>
                  </>
                ) : null}
              </div>
            ):(
              <div className='noSelection'><p>Select a job to see details</p></div>
            )}
        </div>
      </div>
    </div>
  )
}

export default Careers;
