import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SuccessPage.css';

const SuccessPage = () => {
    const navigate = useNavigate();

    const handleBackToHome = () => {
        navigate('/applicant/dashboard');
    };

    return (
        <div className="success-container">
            <div className="success-content">
                <div className="tick-animation">
                    <div className="tick-circle">
                        <svg className="tick-icon" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </div>
                </div>
                
                <h1 className="success-title">Application Submitted Successfully!</h1>
                <p className="success-message">
                    Thank you for your application. We have received your submission and will review it shortly.
                </p>
                
                <button className="back-home-btn" onClick={handleBackToHome}>
                    View my applications
                </button>
            </div>
        </div>
    );
};

export default SuccessPage;
