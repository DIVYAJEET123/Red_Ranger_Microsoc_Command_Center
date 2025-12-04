import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <h1 style={styles.logo}>⚡ MicroSOC Command Center</h1>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        <Link to="/incidents" style={styles.link}>Incidents</Link>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a0000', // Dark Red Background
    borderBottom: '3px solid #ff0000', // Red Accent
    color: 'white',
  },
  logo: { fontSize: '1.5rem', margin: 0 },
  links: { display: 'flex', gap: '20px' },
  link: { color: '#ffffff', textDecoration: 'none', fontWeight: 'bold' }
};

export default Navbar;