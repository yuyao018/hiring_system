import React from 'react'
import './apply_footer.css'

const ApplyFooter = ({ onClear, onSubmit }) => {
    return (
        <footer>
            <div className='footerContainer'>
                <div className='footer1'>
                    <a className='cancelBtn' href="/">Cancel</a>
                    <button className='clearBtn' type='button' onClick={onClear}>Clear form</button>
                </div>
                <div className='footer2'>
                    <button className='submitBtn' onClick={onSubmit}>Submit</button>
                </div>
            </div>
        </footer>
    )
}

export default ApplyFooter