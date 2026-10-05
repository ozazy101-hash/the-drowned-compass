import { useEffect, useRef, useState } from 'react';
import type { PartyData } from '../../domain/party';
import { serializePartyBackup } from '../../domain/party-backup';
import './backup.css';
export function PartyBackupDownload({ partyData }: { partyData: PartyData }) {
  const active = useRef(false), requestVersion = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; requestVersion.current++; }; }, []);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const download = async () => {
    const request = ++requestVersion.current;
    setBusy(true); setFailed(false); setMessage('Preparing saved Party data…');
    let url: string | undefined;
    try {
      const backup = await partyData.exportPartyBackup();
      if (!active.current || request !== requestVersion.current) return;
      url = URL.createObjectURL(new Blob([serializePartyBackup(backup)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'the-drowned-compass-party-data-v1.json'; document.body.append(link); link.click(); link.remove();
      setMessage('Party Data Backup download started. Includes saved data only.');
    } catch (error) { if (!active.current || request !== requestVersion.current) return; setFailed(true); setMessage(error instanceof Error ? error.message : 'The Party Data Backup could not be prepared. Please retry.'); }
    finally { if (url) { const completedUrl = url; setTimeout(() => URL.revokeObjectURL(completedUrl), 1000); } if (active.current && request === requestVersion.current) setBusy(false); }
  };
  return <section className="party-backup" aria-labelledby="party-backup-heading">
    <h2 id="party-backup-heading">Party Data Backup</h2>
    <p>Download saved Character Records, Character Spells, Session Trackers and Party Companion settings as portable JSON. Character backstories and notes are included. Unsaved editor drafts are excluded.</p>
    <p>This is not a backup of campaign story, world, sessions or Dungeon Master preparation. This app does not import or restore backup files.</p>
    <button disabled={busy} onClick={() => void download()}>{busy ? 'Preparing backup…' : failed ? 'Retry Party Data Backup' : 'Download Party Data Backup'}</button>
    <p role={failed ? 'alert' : 'status'}>{message}</p>
  </section>;
}
