import React from "react";
import "./Stepper.css";

const Stepper = ({ steps, currentStep, sectionIds }) => {
    const handleClick = (id) => {
        const section = document.getElementById(id);
        if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };
    return (
        <div className="stepper-container">
        {steps.map((step, index) => (
            <div key={index} className="step">
            <div
                className={`circle ${index === currentStep ? "active" : ""}`}
                onClick={() => handleClick(sectionIds[index])}
                style={{ cursor: "pointer" }}
            >
                {index + 1}
            </div>
            <div className={`label ${index === currentStep ? 'label-active' : ''}`}>{step}</div>
            {index !== steps.length - 1 && <div className="line"></div>}
            </div>
        ))}
        </div>
    );
};

export default Stepper;
