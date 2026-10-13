import './Card.css'

function Card({jobName, applicantName, appliedAt}){
    const formatDateTime = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        const datePart = date.toLocaleDateString();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${datePart} ${hours}:${minutes}`;
    };

    return(
        <div className="card">
            <h2 className='card-jobName'>{jobName}</h2>
            <p className='card-applicantName'>{applicantName}</p>
            <p className='card-date'>{formatDateTime(appliedAt)}</p>
        </div>
    );
}

export default Card