import { MessageCircle } from 'lucide-react';

export default function TaskWhatsApp({ contact }) {
  // Registration stores Indian mobile numbers in national format.
  if (!/^[6-9]\d{9}$/.test(contact?.phone || '')) return null;
  return (
    <a className="btn btn-secondary" href={`https://wa.me/91${contact.phone}`}
      target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${contact.name} on WhatsApp (opens in a new tab)`}>
      <MessageCircle size={18} aria-hidden="true" /> Chat on WhatsApp
    </a>
  );
}
