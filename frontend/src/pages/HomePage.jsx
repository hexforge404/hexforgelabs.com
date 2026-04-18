import React from 'react';
import '../App.css';
import MascotCard from 'components/MascotCard';

const HomePageWrapper = () => (
  <div
    className="homepage-hero"
    style={{
      backgroundImage: `url("/images/hero-background.png")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
    <MascotCard />
  </div>
);

export default HomePageWrapper;

