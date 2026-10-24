// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import LegalNotice from './LegalNotice.jsx';
import HelpControls from './HelpControls.jsx';
import React,{useState} from 'react';
import './welcome.css';

export default function Welcome({ onEnter }) {
 const [language,setLanguage]=useState(()=>localStorage.getItem('traza-bizkaia-language')==='es'?'es':'eu');const t=(eu,es)=>language==='eu'?eu:es;
  return (
    <main className="welcome-page">
      <div className="welcome-card">
        <section className="welcome-copy">
          <div className="welcome-brand"><span className="welcome-brand-mark">T</span><span>TRAZA <i>/ BIZKAIA</i></span></div>
          <label>Hizkuntza / Idioma <select value={language} onChange={e=>{setLanguage(e.target.value);localStorage.setItem('traza-bizkaia-language',e.target.value);}}><option value="eu">Euskara</option><option value="es">Castellano</option></select></label><div className="welcome-heading">
            <span className="welcome-eyebrow">{t('PRESTAKUNTZA ETA BIDE SEGURTASUNA','FORMACIÓN Y SEGURIDAD VIAL')}</span>
            <h1>{t('Ikasten laguntzen duten ibilbideak.','Recorridos que ayudan a aprender.')}</h1>
            <p>{t('Planifikatu aireko ibilbideak, berrikusi benetako GPX ibilbideak eta prestatu saioetarako bideoak.','Planifica trayectorias aéreas, revisa recorridos reales con GPX y prepara vídeos para tus clases.')}</p>
          </div>
          <button className="welcome-enter" onClick={onEnter}>{t('Aplikazioan sartu','Entrar en la aplicación')} <span aria-hidden="true">→</span></button>
          <HelpControls language={language}/><LegalNotice language={language}/>
        </section>
        <aside className="welcome-art" aria-label="AD Mobility, formación y auditoría vial">
          <img src="./ad-mobility-logo.png" alt="AD Mobility · Formación y Auditoría Vial" />
          <div className="welcome-art-caption"><span>{t('PRESTAKUNTZA','FORMACIÓN')}</span><span>·</span><span>{t('BIDE AUDITORIA','AUDITORÍA VIAL')}</span></div>
        </aside>
      </div>
      <footer className="welcome-footer"><span>TRAZA · BIZKAIA</span><span>GeoEuskadi · GPX · Vídeo MP4</span></footer>
    </main>
  );
}
