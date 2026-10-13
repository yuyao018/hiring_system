import React, { useState, useEffect } from 'react'
import './MBTI.css'

const MBTI = ({ onAnswersChange, clearTrigger }) => {
    const questions = [
        {
            question: "1. You're setting off on a big adventure. What's the first thing you pack?",
            options: [
                { label: "A sketchbook full of ideas", value: "A" },
                { label: "A detailed map and compass", value: "B" },
                { label: "A walkie-talkie to stay connected with friends", value: "C" },
                { label: "A multi-tool that can do a bit of everything", value: "D" }
            ]
        },
        {
            question: "2. You come across a locked treasure chest. How do you try to open it?",
            options: [
                { label: "Look for creative patterns or symbols around", value: "A" },
                { label: "Carefully inspect the lock and follow logical steps", value: "B" },
                { label: "Ask your fellow explorers for clues", value: "C" },
                { label: "Experiment with different tricks until something works", value: "D" }
            ]
        },
        {
            question: "3. A storm is coming while you're exploring. What's your move?",
            options: [
                { label: "Think of creative ways to use the storm to your advantage", value: "A" },
                { label: "Find shelter and wait it out safely", value: "B" },
                { label: "Gather your group and make sure everyone is okay", value: "C" },
                { label: "Improvise quickly and keep moving forward", value: "D" }
            ]
        },
        {
            question: "4. When you discover a new mysterious place, you…",
            options: [
                { label: "Sketch or imagine what might have happened there", value: "A" },
                { label: "Document every detail carefully", value: "B" },
                { label: "Call your team over so you can explore together", value: "C" },
                { label: "Dive in and figure things out on the go", value: "D" }
            ]
        },
        {
            question: "5. You stumble upon a strange new tool from another civilization. What do you do?",
            options: [
                { label: "Play around with it and see how it works", value: "A" },
                { label: "Study it carefully to understand its purpose", value: "B" },
                { label: "Ask the locals or teammates what they think", value: "C" },
                { label: "Test it out right away to see if it's useful", value: "D" }
            ]
        },
        {
            question: "6. Which campfire role do you naturally take?",
            options: [
                { label: "The storyteller weaving exciting tales", value: "A" },
                { label: "The planner making sure food and supplies are ready", value: "B" },
                { label: "The friendly host making sure everyone feels included", value: "C" },
                { label: "The fixer who sets up the fire and keeps it going", value: "D" }
            ]
        },
        {
            question: "7. If you could have a magical animal companion, which would you choose?",
            options: [
                { label: "A phoenix", value: "A" },
                { label: "A wise owl", value: "B" },
                { label: "A loyal wolf", value: "C" },
                { label: "A quick panther", value: "D" }
            ]
        },
        {
            question: "8. You find yourself lost in a maze. How do you escape?",
            options: [
                { label: "Look for unusual patterns or hidden symbols", value: "A" },
                { label: "Mark every path carefully until you find the exit", value: "B" },
                { label: "Shout to coordinate with your team", value: "C" },
                { label: "Try multiple paths quickly until you get out", value: "D" }
            ]
        },
        {
            question: "9. The council of explorers gives you a choice of reward. You pick…",
            options: [
                { label: "A magical pen that makes ideas come alive", value: "A" },
                { label: "A crystal that always shows the safest path", value: "B" },
                { label: "A charm that helps you connect with anyone", value: "C" },
                { label: "A stone that gives you adaptability in any situation", value: "D" }
            ]
        },
        {
            question: "10. Finally — if your adventure were a movie, what would it be like?",
            options: [
                { label: "A creative fantasy full of surprises", value: "A" },
                { label: "A carefully planned documentary", value: "B" },
                { label: "A warm, feel-good ensemble story", value: "C" },
                { label: "A fast-paced survival thriller", value: "D" }
            ]
        }
    ]

    const [answers, setAnswers] = useState(Array(questions.length).fill(null))
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const [isEntering, setIsEntering] = useState(false)
    const [direction, setDirection] = useState('left')

    const getPersonalityDescription = (type) => {
        const descriptions = {
            'The Innovator': {
                symbol: '✨',
                description: 'You\'re an idea generator. You thrive on imagination, creativity, and unique solutions.',
                strengths: 'Creative problem-solving, vision, innovation',
                workStyle: 'Big-picture thinker, loves new challenges'
            },
            'The Organizer': {
                symbol: '🧭',
                description: 'You bring order to the unknown. You\'re detail-oriented, structured, and reliable.',
                strengths: 'Planning, precision, consistency',
                workStyle: 'Methodical, logical, strong with processes'
            },
            'The Connector': {
                symbol: '🌿',
                description: 'You\'re the glue that keeps the team together. You thrive on communication and teamwork.',
                strengths: 'Empathy, collaboration, team spirit',
                workStyle: 'Builds strong relationships, motivates others'
            },
            'The Adapter': {
                symbol: '⚡',
                description: 'You\'re resourceful and flexible. You can quickly adjust when things change.',
                strengths: 'Resilience, adaptability, quick execution',
                workStyle: 'Hands-on, action-driven, learns by doing'
            },
            'Creative Organizer': {
                symbol: '🌟',
                description: 'Visionary but structured, balances ideas with execution.',
                strengths: 'Creative planning, innovative processes',
                workStyle: 'Big-picture planner, creative problem-solver'
            },
            'Friendly Innovator': {
                symbol: '🤝✨',
                description: 'Brings creativity to teamwork, thrives in co-creation.',
                strengths: 'Creative collaboration, team innovation',
                workStyle: 'Creative team player, idea facilitator'
            },
            'Adaptive Dreamer': {
                symbol: '⚡✨',
                description: 'Creative, experimental, and quick to adjust.',
                strengths: 'Creative adaptability, experimental thinking',
                workStyle: 'Flexible innovator, experimental problem-solver'
            },
            'Strategic Connector': {
                symbol: '🧭🌿',
                description: 'Organized but people-focused, reliable team anchor.',
                strengths: 'Structured collaboration, team organization',
                workStyle: 'Organized team leader, reliable collaborator'
            },
            'Practical Adapter': {
                symbol: '🧭⚡',
                description: 'Structured but flexible, blends planning with agility.',
                strengths: 'Adaptive planning, flexible execution',
                workStyle: 'Flexible planner, adaptive executor'
            },
            'Social Explorer': {
                symbol: '🌿⚡',
                description: 'Empathetic, adaptable, thrives in dynamic group work.',
                strengths: 'Team adaptability, social flexibility',
                workStyle: 'Dynamic team player, social problem-solver'
            },
            'The Pathfinder': {
                symbol: '🌟🧭🌿',
                description: 'Blends creativity, structure, and collaboration. The "bridge-builder" between vision, process, and people.',
                strengths: 'Creative organization, collaborative innovation',
                workStyle: 'Visionary team organizer, creative process builder'
            },
            'The Trailblazer': {
                symbol: '✨⚡🧭',
                description: 'Creative but pragmatic, adapts quickly while staying strategic.',
                strengths: 'Strategic creativity, adaptive innovation',
                workStyle: 'Strategic innovator, creative adapter'
            },
            'The Mediator': {
                symbol: '🌿🧭⚡',
                description: 'Team-oriented, dependable, flexible — keeps everyone steady during change.',
                strengths: 'Team stability, adaptive collaboration',
                workStyle: 'Stable team anchor, flexible mediator'
            },
            'The Dreamweaver': {
                symbol: '✨🌿⚡',
                description: 'Visionary, empathetic, and adaptable — thrives in dynamic teams.',
                strengths: 'Creative empathy, adaptive vision',
                workStyle: 'Dynamic creative leader, empathetic innovator'
            }
        };
        
        return descriptions[type] || {
            symbol: '🌟',
            description: 'A balanced explorer with diverse strengths.',
            strengths: 'Versatility, adaptability, balance',
            workStyle: 'Flexible, well-rounded contributor'
        };
    };

    const calculatePersonalityType = (answers) => {
        if (!answers || answers.length === 0) return null;
        
        const counts = { A: 0, B: 0, C: 0, D: 0 };
        answers.forEach(answer => {
            if (answer) counts[answer]++;
        });
        
        const maxCount = Math.max(...Object.values(counts));
        const dominantTypes = Object.entries(counts)
            .filter(([_, count]) => count === maxCount)
            .map(([type, _]) => type)
            .sort();
        
        const typeMap = {
            'A': 'The Innovator',
            'B': 'The Organizer', 
            'C': 'The Connector',
            'D': 'The Adapter'
        };
        
        const hybridMap = {
            'AB': 'Creative Organizer',
            'AC': 'Friendly Innovator',
            'AD': 'Adaptive Dreamer',
            'BC': 'Strategic Connector',
            'BD': 'Practical Adapter',
            'CD': 'Social Explorer'
        };
        
        const rareMap = {
            'ABC': 'The Pathfinder',
            'ABD': 'The Trailblazer',
            'ACD': 'The Dreamweaver',
            'BCD': 'The Mediator'
        };
        
        if (dominantTypes.length === 1) {
            return typeMap[dominantTypes[0]];
        } else if (dominantTypes.length === 2) {
            const key = dominantTypes.join('');
            return hybridMap[key] || `${typeMap[dominantTypes[0]]} + ${typeMap[dominantTypes[1]]}`;
        } else if (dominantTypes.length === 3) {
            const key = dominantTypes.join('');
            return rareMap[key] || 'The Balanced Explorer';
        } else {
            return 'The Balanced Explorer';
        }
    };

    const goNext = () => {
        if (currentIndex >= questions.length) return;
        setDirection('left')
        setIsSwiping(true)
        setTimeout(() => {
            setIsSwiping(false)
            setCurrentIndex(prev => Math.min(prev + 1, questions.length))
        }, 250)
    }

    const goPrev = () => {
        if (currentIndex <= 0) return;
        setDirection('right')
        setIsSwiping(true)
        setTimeout(() => {
            setIsSwiping(false)
            setCurrentIndex(prev => Math.max(prev - 1, 0))
        }, 250)
    }

    const handleAnswer = (qIndex, option) => {
        const updatedAnswers = [...answers]
        updatedAnswers[qIndex] = option
        setAnswers(updatedAnswers)
        onAnswersChange(updatedAnswers)
        goNext()
    }

    useEffect(() => {
        // reset when clearTrigger changes
        setAnswers(Array(questions.length).fill(null))
        onAnswersChange(Array(questions.length).fill(null))
        setCurrentIndex(0)
    }, [clearTrigger, onAnswersChange, questions.length])

    useEffect(() => {
        // animate entering of a new question
        setIsEntering(true)
        const t = setTimeout(() => setIsEntering(false), 250)
        return () => clearTimeout(t)
    }, [currentIndex])

    const isComplete = currentIndex >= questions.length
    const progress = Math.min(currentIndex, questions.length)
    const personalityType = calculatePersonalityType(answers)
    const personalityInfo = personalityType ? getPersonalityDescription(personalityType) : null

    const slideClasses = () => {
        const base = 'question-card slide'
        const swipe = isSwiping ? (direction === 'left' ? ' swipe-left' : ' swipe-right') : ''
        const enter = isEntering ? (direction === 'left' ? ' slide-in' : ' slide-in-right') : ''
        return base + swipe + enter
    }

    return (
        <div className="mbti-container">
            <div className="mbti-progress">
                <div className="mbti-progress-bar" style={{ width: `${(progress / questions.length) * 100}%` }} />
            </div>

            {!isComplete ? (
                <>
                    <div className={slideClasses()}>
                        <p>{questions[currentIndex].question}</p>
                        <div className="options">
                            {questions[currentIndex].options.map((opt, oIndex) => (
                                <label key={oIndex} className="option-label">
                                    <input
                                    type="radio"
                                    name={`question-${currentIndex}`}
                                    value={opt.value}
                                    checked={answers[currentIndex] === opt.value}
                                    onChange={(e) => handleAnswer(currentIndex, e.target.value)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="mbti-controls">
                        <button type="button" className="nav-btn" onClick={goPrev} disabled={currentIndex === 0}>&lt;</button>
                        <button type="button" className="nav-btn" onClick={goNext} disabled={currentIndex >= questions.length}>&gt;</button>
                    </div>
                </>
            ) : (
                <div className="question-card slide slide-in">
                    <div className="personality-results">
                        <h3>🌟 Your Explorer Type 🌟</h3>
                        <div className="personality-type">
                            <div className="type-symbol">{personalityInfo?.symbol} <h2>{personalityType}</h2></div>
                        </div>
                        {personalityInfo && (
                            <div className="personality-details">
                                <b><p className="type-description">{personalityInfo.description}</p></b>
                                <div className="type-attributes">
                                    <div className="attribute">
                                        <strong>Strengths:</strong> {personalityInfo.strengths}
                                    </div>
                                    <div className="attribute">
                                        <strong>Work Style:</strong> {personalityInfo.workStyle}
                                    </div>
                                </div>
                            </div>
                        )}
                        <p className="completion-message">All questions completed. You can review and submit your application.</p>
                    </div>
                    <div className="mbti-controls">
                        <button type="button" className="nav-btn" onClick={() => { setDirection('right'); setCurrentIndex(questions.length - 1); }}>&lt;</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MBTI