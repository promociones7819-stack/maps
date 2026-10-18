// SPDX-FileCopyrightText: 2026 Aitor Delgado Martínez · AD Mobility
// SPDX-License-Identifier: LicenseRef-RutasAD-Educational-NonCommercial-1.0
import React from 'react';
import './legal-notice.css';
export default function LegalNotice({language='eu'}){
 const t=(eu,es)=>language==='eu'?eu:es;
 return <aside className="rutas-legal-notice" aria-label={t('Egiletza eta kodearen lizentzia','Autoría y licencia del código')}>
  <strong>© 2026 Aitor Delgado Martínez · AD Mobility</strong>
  <span>{t('Eskubide guztiak erreserbatuta.','Todos los derechos reservados.')}</span>
  <p>{t('Kodea berrerabiltzea: probak eta irakaskuntza soilik, onura ekonomiko edo materialik gabe eta egilea nahitaez aipatuta.','Reutilización del código: solo pruebas y enseñanza sin beneficio económico o material, con atribución obligatoria al autor.')}</p>
  <p>{t('Baimenik gabeko erabilerak dagozkien legezko bideetatik salatuko dira.','Los usos no autorizados serán denunciados por las vías legalmente procedentes.')}</p>
  <a href="/licencia.html" target="_blank" rel="noopener noreferrer">{t('Lizentzia osoa eta hirugarrenen eskubideak','Licencia completa y derechos de terceros')}</a>
 </aside>;
}
