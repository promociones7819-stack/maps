import React from 'react';
import './welcome.css';

export default function Welcome({ onEnter }) {
  return (
    <main className="welcome-page">
      <div className="welcome-card">
        <section className="welcome-copy">
          <div className="welcome-brand"><span className="welcome-brand-mark">T</span><span>TRAZA <i>/ BIZKAIA</i></span></div>
          <div className="welcome-heading">
            <span className="welcome-eyebrow">FORMACIÓN Y SEGURIDAD VIAL</span>
            <h1>Recorridos que ayudan a aprender.</h1>
            <p>Planifica trayectorias aéreas, revisa recorridos reales con GPX y prepara vídeos para tus clases.</p>
          </div>
          <button className="welcome-enter" onClick={onEnter}>Entrar en la aplicación <span aria-hidden="true">→</span></button>
          <div className="welcome-created">App creada por <strong>AD Mobility</strong></div>
        </section>
        <aside className="welcome-art" aria-label="AD Mobility, formación y auditoría vial">
          <img src="./ad-mobility-logo.png" alt="AD Mobility · Formación y Auditoría Vial" />
          <div className="welcome-art-caption"><span>FORMACIÓN</span><span>·</span><span>AUDITORÍA VIAL</span></div>
        </aside>
      </div>
      <footer className="welcome-footer"><span>TRAZA · BIZKAIA</span><span>GeoEuskadi · GPX · Vídeo MP4</span></footer>
    </main>
  );
}
