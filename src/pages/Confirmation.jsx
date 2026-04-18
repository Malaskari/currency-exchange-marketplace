import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, MessageCircle, ArrowLeft } from 'lucide-react';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '218943775692';

const Confirmation = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const req = state?.request;

  const wa = () => {
    const msg = encodeURIComponent(`Hello RateX! My request ID is ${req?.id}. I submitted a request to sell $${req?.usdAmount} USD.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  return (
    <div className="confirm-page">
      <div className="confirm-card">
        <div className="confirm-icon">
          <CheckCircle size={44} />
        </div>
        <div className="confirm-title">Request Submitted!</div>
        <p className="confirm-sub">
          Your exchange request has been received. Our team will contact you on WhatsApp within the next few minutes to confirm the details.
        </p>

        {req && (
          <div className="confirm-id">
            <div className="confirm-id-label">Your Request ID</div>
            <div className="confirm-id-value">{req.id}</div>
          </div>
        )}

        <div className="confirm-actions">
          <button className="btn btn-whatsapp btn-lg btn-full" onClick={wa}>
            <MessageCircle size={18} /> Contact us on WhatsApp
          </button>
          <button className="btn btn-outline btn-lg btn-full" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>

        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          We do not store any sensitive card details. Only the information you provided in the form is saved securely.
        </p>
      </div>
    </div>
  );
};

export default Confirmation;
