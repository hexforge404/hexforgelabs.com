import React from 'react';
import './MascotCard.css';


const MascotCard = () => {
  return (
    <div className="mascot-card">
      <img src="/images/hexforge-logo-removebg.png" alt="HexForge Mascot" className="mascot-image" />
      <div className="mascot-text">
        <h1>Welcome to HexForge Labs</h1>
        <p>Discover hacking tools, DIY builds, and blog content made for rebels, makers, and tinkerers.</p>
        <a href="/store" className="mascot-button">🧪 Enter the Lab</a>
      </div>
    </div>
  );
};

export default MascotCard;
