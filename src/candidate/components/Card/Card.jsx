import './Card.css'

function Card({title, type, experience, postedAt, selected}){
    return(
        <div className={`card${selected ? ' selected' : ''}`}>
            <h2>{title}</h2>
            {type ? <span className="badge">{type}</span> : null}
            {experience ? <span className="badge">{experience}</span> : null}
            <p className='postDate'>Posted {postedAt}</p>
        </div>
    );
}

export default Card