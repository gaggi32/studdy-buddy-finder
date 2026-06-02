import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { profileApi } from '../api.js';

import BasicProfile from './BasicProfile.jsx';
import SubjectsGoals from './SubjectsGoals.jsx';
import StudyTimes from './StudyTimes.jsx';

const STEPS = ['Profile', 'Subjects', 'Schedule'];

export default function OnboardingFlow() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  async function saveProfile(data) {
    const updated = await profileApi.saveProfile(user.id, data);
    setUser(updated);
    setStep(1);
  }

  async function saveSubjects(subjects, learningGoals) {
    const updated = await profileApi.saveSubjects(user.id, subjects, learningGoals);
    setUser(updated);
    setStep(2);
  }

  async function saveAvailability(availability) {
    const updated = await profileApi.saveAvailability(user.id, availability);
    setUser(updated);
    navigate('/dashboard');
  }

  return (
    <div className="page-wrap">
      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Step indicator */}
        <div className="step-labels">
          {STEPS.map((label, idx) => (
            <span
              key={label}
              className={`step-label ${idx === step ? 'active' : idx < step ? 'done' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="step-bar">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`step-segment ${idx < step ? 'done' : idx === step ? 'active' : ''}`}
            />
          ))}
        </div>

        {step === 0 && (
          <BasicProfile initial={user.profile} onSave={saveProfile} />
        )}
        {step === 1 && (
          <SubjectsGoals
            initialSubjects={user.subjects}
            initialGoals={user.learningGoals}
            onSave={saveSubjects}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StudyTimes
            initial={user.availability}
            onSave={saveAvailability}
            onBack={() => setStep(1)}
          />
        )}
      </div>
    </div>
  );
}
