import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCreateBooking, useGetAvailability, useListBarbers, useListServices, useSubmitContact, useValidatePromotion, getGetAvailabilityQueryKey } from '@workspace/api-client-react';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Menu, X } from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Service = { id: number; name: string; slug: string; description: string; price: number; durationMinutes: number };
type Barber = { id: number; name: string; specialty: string; bio: string; imageUrl: string };
type Confirmation = { reference: string; service: Service; barber: Barber; customerName: string; customerEmail: string; customerPhone: string; date: string; time: string; endTime: string; durationMinutes: number; location: string; subtotal: number; discount: number; total: number; promotionCode: string | null };

const stockBarbers: Barber[] = [
  { id: 1, name: 'Mandla Ndlovu', specialty: 'Fades & texture', bio: 'Mandla works in clean lines and soft transitions, bringing a measured eye to every fade.', imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85' },
  { id: 2, name: 'Lena Jacobs', specialty: 'Classic cuts & beard work', bio: 'Lena favours timeless shapes with just enough edge, from a close crop to a sculpted beard.', imageUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=900&q=85' },
  { id: 3, name: 'Thabo Maseko', specialty: 'Modern grooming', bio: 'Thabo brings calm precision to modern cuts and the small finishing details people notice.', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85' },
];
const stockServices: Service[] = [
  { id: 1, name: 'Classic Cut', slug: 'classic-cut', description: 'A considered cut, finished with a clean neckline and hot towel detail.', price: 180, durationMinutes: 30 },
  { id: 2, name: 'Skin Fade', slug: 'skin-fade', description: 'A precise skin fade with tailored texture through the top.', price: 220, durationMinutes: 45 },
  { id: 3, name: 'Beard Sculpt', slug: 'beard-sculpt', description: 'Shape, line and soften your beard with a warm towel finish.', price: 120, durationMinutes: 20 },
  { id: 4, name: 'Cut & Beard', slug: 'cut-and-beard', description: 'The full reset: a tailored cut paired with a considered beard shape.', price: 280, durationMinutes: 60 },
  { id: 5, name: 'Kids’ Cut', slug: 'kids-cut', description: 'A patient, tidy cut for younger guests, finished at their pace.', price: 140, durationMinutes: 30 },
  { id: 6, name: 'Signature Grooming', slug: 'signature-grooming', description: 'Our complete ritual: cut, beard, hot towel and a quiet moment to reset.', price: 350, durationMinutes: 75 },
];

function Meta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} — CROWN & BLADE`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
  }, [title, description]);
  return null;
}

function Header({ onOffer }: { onOffer: () => void }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const nav = [['Services', '/services'], ['Our story', '/about'], ['Private enquiry', '/contact']];
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark" aria-hidden="true" /><span className="brand-wordmark">CROWN & BLADE<span>BARBER SHOP · CAPE TOWN</span></span></Link>
    <nav className={`main-nav ${open ? 'open' : ''}`} aria-label="Main navigation">{nav.map(([label, href]) => <Link key={href} href={href} aria-current={location === href ? 'page' : undefined} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setOpen(false)}>{label}</Link>)}<button className="first-visit-link" onClick={() => { onOffer(); setOpen(false); }} data-testid="button-first-visit">First visit?</button><Link className="btn btn-dark" href="/booking" data-testid="link-book-header">Book a chair <ArrowRight size={14} /></Link></nav>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-menu">{open ? <X size={23} /> : <Menu size={23} />}</button>
  </div></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container"><div className="footer-top"><div><div className="footer-mark">Good hair days<br /><em>start here.</em></div><p className="muted" style={{ maxWidth: 300, marginTop: 28 }}>A neighbourhood barber shop for considered cuts, close shaves and the people of Cape Town.</p></div><div className="footer-links"><div><div className="mono" style={{ color: 'hsl(var(--accent))', marginBottom: 20 }}>Explore</div><Link href="/services">Services</Link><Link href="/about">Our story</Link><Link href="/booking">Book a chair</Link></div><div><div className="mono" style={{ color: 'hsl(var(--accent))', marginBottom: 20 }}>Find us</div><span style={{ display: 'block', color: 'hsl(var(--primary-foreground) / .7)', fontSize: '.72rem', lineHeight: 1.7 }}>17 Bree Street<br />Cape Town, 8001<br />Mon–Fri · 09:00–18:00<br />Sat · 08:00–16:00<br />Sun · Closed</span></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CROWN & BLADE</span><span>Fictional business built for practical assessment</span><span><Link href="/terms">Terms</Link> &nbsp;·&nbsp; <Link href="/privacy">Privacy</Link></span></div></div></footer>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [offer, setOffer] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (location === '/booking' || sessionStorage.getItem('cb-offer-seen')) return undefined;
    const t = window.setTimeout(() => setOffer(true), 900);
    return () => window.clearTimeout(t);
  }, [location]);
  useEffect(() => {
    if (!offer) return undefined;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOffer(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [offer]);
  const dismiss = () => { sessionStorage.setItem('cb-offer-seen', '1'); setOffer(false); };
  return <div className="site-shell"><Header onOffer={() => setOffer(true)} />{children}<Footer />{offer && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="offer-title"><div className="offer-modal"><button ref={closeButtonRef} className="close" onClick={dismiss} aria-label="Close offer" data-testid="button-close-offer">×</button><div className="eyebrow">A little welcome</div><h2 id="offer-title">Your first cut,<br /><em>on us.</em></h2><p className="body-large">Take 10% off your first visit. Use this code when you book your chair.</p><p className="offer-code">FIRSTCUT10</p><div style={{ marginTop: 28 }}><Link href="/booking" className="btn btn-dark" onClick={dismiss} data-testid="link-offer-book">Book with FIRSTCUT10 <ArrowRight size={14} /></Link></div></div></div>}</div>;
}

function Home() {
  const { data: apiServices, isLoading } = useListServices();
  const services = (apiServices as Service[] | undefined) ?? stockServices;
  return <><Meta title="Neighbourhood barbering, considered" description="CROWN & BLADE is a contemporary neighbourhood barber shop in Cape Town." /><main><section className="container hero"><div className="hero-copy"><div className="eyebrow">Cape Town · Made for the neighbourhood</div><h1 className="display">A better<br /><strong>barber</strong><br />day.</h1><p className="body-large muted">Contemporary cuts, close shaves and a chair worth taking your time in.</p><div className="hero-actions"><Link className="btn btn-dark" href="/booking" data-testid="link-book-hero">Book a chair <ArrowRight size={14} /></Link><Link className="btn btn-line" href="/services" data-testid="link-services-hero">See services</Link></div></div><div className="hero-art"><img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=85" alt="Barber carefully trimming a client's hair in a warm, detailed shop" /><span className="art-caption">17 BREE STREET · CAPE TOWN</span></div><div className="scroll-cue mono">Scroll to explore</div></section><div className="marquee"><div className="marquee-track"><span>Cut with care</span><b>·</b><span>Stay a while</span><b>·</b><span>Leave feeling like yourself</span><b>·</b><span>Cut with care</span><b>·</b><span>Stay a while</span><b>·</b><span>Leave feeling like yourself</span></div></div><section className="page-section container"><div className="intro"><div className="eyebrow">The C&B approach</div><div className="intro-copy"><h2>Not rushed.<br /><em>Never random.</em></h2><p className="body-large muted">The best barbering is a conversation between a sharp blade, a steady hand and the person in the chair. We take the time to get the shape right.</p><Link href="/about" className="btn btn-line" data-testid="link-story-home">Meet the shop <ArrowRight size={14} /></Link></div></div><div className="feature-grid"><div className="feature-image"><img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=85" alt="Close detail of barber tools and a classic cut" /></div><div className="feature-note"><div className="mono" style={{ color: 'hsl(var(--accent))' }}>On the menu</div><h3>{isLoading ? 'Loading the chair list…' : services[0]?.name ?? 'Classic Cut'}</h3><p className="muted">{services[0]?.description ?? 'A considered cut, finished with a clean neckline and hot towel detail.'}</p><Link href={`/booking?service=${services[0]?.slug ?? 'classic-cut'}`} className="mono" style={{ color: 'hsl(var(--accent))' }} data-testid="link-feature-book">Reserve this service →</Link></div></div></section><section className="dark-band page-section"><div className="container editorial-split"><div><div className="number-stamp">01</div><h2>The ritual<br /><em>matters.</em></h2><p className="body-large muted">A warm towel. A good mirror. No one shouting over the clippers. Come in for the cut, stay for the reset.</p></div><div className="editorial-photo"><img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85" alt="Classic barber chair and mirror in a softly lit interior" /></div></div></section></main></>;
}

function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) { return <section className="page-hero"><div className="container"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{children}</div></section>; }

function Services() {
  const { data, isLoading, isError } = useListServices();
  const services = (data as Service[] | undefined) ?? [];
  return <><Meta title="Services" description="Cuts, shaves and considered combinations at CROWN & BLADE." /><main><PageHero eyebrow="The menu" title={<>Good work,<br /><em>well priced.</em></>}><p className="body-large muted">No mystery packages. Just a small, thoughtful menu and enough time to do things properly.</p></PageHero><section className="page-section container"><div className="service-list">{isLoading ? <div className="loading-block"><div style={{ width: '100%' }}><div className="skeleton" /><div className="skeleton" style={{ marginTop: 25, width: '80%' }} /></div></div> : isError ? <div className="notice">We couldn't load the menu right now. Please try again shortly.</div> : services.length === 0 ? <div className="notice">The chair list is being refreshed. Call the shop to enquire.</div> : services.map((service, i) => <div className="service-row" key={service.id} data-testid={`row-service-${service.id}`}><div className="service-number mono">0{i + 1}</div><div className="service-name">{service.name}</div><div className="service-description">{service.description}</div><div className="service-time"><Clock3 size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />{service.durationMinutes} min</div><div className="service-price">R {service.price.toFixed(0)}</div><Link className="btn btn-line" href={`/booking?service=${service.slug}`} data-testid={`link-book-service-${service.id}`}>Book <ArrowRight size={13} /></Link></div>)}</div></section></main></>;
}

function About() {
  const { data } = useListBarbers();
  const barbers = (data as Barber[] | undefined) ?? stockBarbers;
  return <><Meta title="Our story" description="Meet the people and place behind CROWN & BLADE in Cape Town." /><main><PageHero eyebrow="A small shop with a point of view" title={<>Made for the<br /><em>neighbourhood.</em></>}><p className="body-large muted">CROWN & BLADE is a contemporary barber shop on Bree Street. A place to get looked after, without making a fuss about it.</p></PageHero><section className="page-section container"><div className="editorial-split"><div><div className="eyebrow">The story so far</div><h2>Sharp work.<br /><em>Soft landing.</em></h2><p className="body-large muted">We opened CROWN & BLADE with a simple belief: a barber shop should be part of your week, not an event you need to prepare for. Good conversation is welcome. Silence is too. The standard stays the same either way.</p><p className="muted">Come as you are. Leave a little more put together.</p></div><div className="editorial-photo"><img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1000&q=85" alt="Warmly lit barber tools and details inside CROWN & BLADE" /></div></div></section><section className="page-section" style={{ paddingTop: 40 }}><div className="container"><div className="eyebrow">The barbers</div><div className="profile-grid">{barbers.map((barber) => <article className="profile-card" key={barber.id} data-testid={`card-barber-${barber.id}`}><div className="profile-image"><img src={barber.imageUrl || stockBarbers.find((b) => b.id === barber.id)?.imageUrl} alt={`${barber.name}, barber at CROWN & BLADE`} /></div><div className="profile-specialty">{barber.specialty}</div><h3>{barber.name}</h3><p className="muted">{barber.bio}</p></article>)}</div></div></section></main></>;
}

function Contact() {
  const submit = useSubmitContact();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); submit.mutate({ data: { name: String(form.get('name')), email: String(form.get('email')), message: String(form.get('message')) } }, { onSuccess: () => { setSent(true); }, onError: () => setError('Something got in the way. Please try again.') }); };
  return <><Meta title="Private enquiry" description="Send a private enquiry to CROWN & BLADE." /><main><PageHero eyebrow="Get in touch" title={<>A line<br /><em>between us.</em></>}><p className="body-large muted">Questions about a service, a group booking, or just want to say hello? We read every message.</p></PageHero><section className="page-section container"><div className="contact-grid"><div><h2>Come by<br /><em>soon.</em></h2><div className="contact-detail"><b>Address</b><span>17 Bree Street<br />Cape Town, 8001<br /><small>Fictional assessment location</small></span></div><div className="contact-detail"><b>Hours</b><span>Monday–Friday · 09:00–18:00<br />Saturday · 08:00–16:00<br />Sunday · Closed</span></div><div className="contact-detail"><b>Booking</b><span>Choose a service and time<br />on our booking page.</span></div></div><div className="form-card">{sent ? <div className="confirmation"><div className="check"><Check /></div><div className="eyebrow" style={{ justifyContent: 'center' }}>Message received</div><h3>Thanks for<br /><em>getting in touch.</em></h3><p className="muted">We’ve received your message and will review it during shop hours.</p><button className="btn btn-line" onClick={() => setSent(false)} data-testid="button-send-another">Send another enquiry</button></div> : <form onSubmit={onSubmit}><h3>Private<br /><em>enquiry.</em></h3><div className="field-grid"><div className="field"><label htmlFor="contact-name">Name</label><input id="contact-name" name="name" required minLength={2} data-testid="input-contact-name" /></div><div className="field"><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" required data-testid="input-contact-email" /></div><div className="field full"><label htmlFor="contact-message">How can we help?</label><textarea id="contact-message" name="message" required minLength={10} data-testid="input-contact-message" /></div></div>{error && <p className="error-note" role="alert">{error}</p>}<button className="btn btn-dark" style={{ marginTop: 25 }} type="submit" disabled={submit.isPending} data-testid="button-submit-contact">{submit.isPending ? 'Sending…' : 'Send enquiry'} <ArrowRight size={14} /></button></form>}</div></div></section></main></>;
}

function Booking() {
  const servicesQuery = useListServices();
  const barbersQuery = useListBarbers();
  const services = (servicesQuery.data as Service[] | undefined) ?? stockServices;
  const barbers = (barbersQuery.data as Barber[] | undefined) ?? stockBarbers;
  const params = new URLSearchParams(window.location.search);
  const initialService = services.find((service) => service.slug === params.get('service'))?.id ?? services[0]?.id ?? 1;
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(initialService);
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? 1);
  const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); });
  const [time, setTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoPercent, setPromoPercent] = useState(0);
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const promotion = useValidatePromotion();
  const booking = useCreateBooking();
  useEffect(() => {
    const requestedSlug = new URLSearchParams(window.location.search).get('service');
    const requestedService = (servicesQuery.data as Service[] | undefined)?.find((service) => service.slug === requestedSlug);
    if (requestedService) setServiceId(requestedService.id);
  }, [servicesQuery.data]);
  const availabilityParams = useMemo(() => ({ serviceId, barberId, date }), [serviceId, barberId, date]);
  const availability = useGetAvailability(availabilityParams, { query: { enabled: step === 2 && !!serviceId && !!barberId && !!date, queryKey: getGetAvailabilityQueryKey(availabilityParams) } });
  const chosenService = services.find((service) => service.id === serviceId) ?? services[0];
  const chosenBarber = barbers.find((barber) => barber.id === barberId) ?? barbers[0];
  const availableTimes = availability.data?.isClosed ? [] : (availability.data?.times ?? []);
  const discount = chosenService ? chosenService.price * promoPercent / 100 : 0;
  const money = (amount: number) => `R ${amount.toFixed(0)}`;
  const goNext = () => {
    setFormError('');
    if (step === 1 && (!serviceId || !barberId || !date)) { setFormError('Choose a service, barber and day to continue.'); return; }
    if (step === 2 && !time) { setFormError('Choose an available time to continue.'); return; }
    if (step === 3 && (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim())) { setFormError('Please fill in your name, email and phone number.'); return; }
    setStep((current) => Math.min(4, current + 1));
  };
  const validateCode = () => {
    if (!promotionCode.trim()) { setPromoMessage('Enter a code first.'); return; }
    promotion.mutate({ data: { code: promotionCode.trim() } }, { onSuccess: (result) => { setPromoPercent(result.valid ? result.discountPercent : 0); setPromoMessage(result.message); }, onError: () => setPromoMessage('We couldn’t validate that code right now.') });
  };
  const submitBooking = () => {
    if (!chosenService || !chosenBarber) return;
    setFormError('');
    booking.mutate({ data: { serviceId: chosenService.id, barberId: chosenBarber.id, date, time, customerName: customerName.trim(), customerEmail: customerEmail.trim(), customerPhone: customerPhone.trim(), notes: notes.trim() || null, promotionCode: promotionCode.trim() || null } }, { onSuccess: (result) => { setConfirmation(result as Confirmation); setStep(5); }, onError: () => setFormError('That time may have just been taken. Please choose another and try again.') });
  };
  const addToAppleCalendar = () => {
    if (!confirmation) return;
    const start = `${confirmation.date.replaceAll('-', '')}T${confirmation.time.replace(':', '')}00`;
    const end = `${confirmation.date.replaceAll('-', '')}T${confirmation.endTime.replace(':', '')}00`;
    const escapeIcs = (value: string) => value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
    const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
    const description = escapeIcs(`Service: ${confirmation.service.name}
Barber: ${confirmation.barber.name}
Reference: ${confirmation.reference}
Total: R ${confirmation.total}`);
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Crown and Blade//EN\r\nCALSCALE:GREGORIAN\r\nBEGIN:VEVENT\r\nUID:${confirmation.reference}@crownandblade\r\nDTSTAMP:${stamp}\r\nDTSTART;TZID=Africa/Johannesburg:${start.replace('T', 'T')}\r\nDTEND;TZID=Africa/Johannesburg:${end.replace('T', 'T')}\r\nSUMMARY:${escapeIcs(`${confirmation.service.name} at CROWN & BLADE`)}\r\nDESCRIPTION:${description}\r\nLOCATION:${escapeIcs(confirmation.location)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `crown-blade-${confirmation.reference}.ics`; anchor.click(); URL.revokeObjectURL(url);
  };
  const googleCalendar = confirmation ? `https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Africa%2FJohannesburg&text=${encodeURIComponent(`${confirmation.service.name} at CROWN & BLADE`)}&dates=${confirmation.date.replaceAll('-', '')}T${confirmation.time.replace(':', '')}00/${confirmation.date.replaceAll('-', '')}T${confirmation.endTime.replace(':', '')}00&details=${encodeURIComponent(`Appointment for ${confirmation.customerName}. Barber: ${confirmation.barber.name}. Reference ${confirmation.reference}. Total: R ${confirmation.total}.`)}&location=${encodeURIComponent(confirmation.location)}` : '#';
  return <><Meta title="Book a chair" description="Choose your service, barber and time at CROWN & BLADE." /><main><PageHero eyebrow="Reserve your chair" title={<>Take your<br /><em>time.</em></>}><p className="body-large muted">A few details, then you’re in. Your choices stay with you as you move through the booking.</p></PageHero><section className="page-section container" style={{ paddingTop: 55 }}><div className="booking-layout"><aside className="steps" aria-label="Booking progress">{['Service & barber', 'Date & time', 'Your details', 'Review'].map((label, i) => <div className={`step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`} key={label}><span>{step > i + 1 ? <Check size={13} /> : i + 1}</span>{label}</div>)}</aside><div className="booking-card">
    {step < 5 && <><h2>{step === 1 ? <>Find your<br /><em>fit.</em></> : step === 2 ? <>Pick a<br /><em>moment.</em></> : step === 3 ? <>A few<br /><em>details.</em></> : <>Check the<br /><em>details.</em></>}</h2>
      {step === 1 && <div className="field-grid"><div className="field full"><label>Service</label><div className="option-grid">{services.map((service) => <button type="button" className={`option ${service.id === serviceId ? 'selected' : ''}`} onClick={() => setServiceId(service.id)} key={service.id} data-testid={`button-booking-service-${service.id}`}><strong>{service.name}</strong><small>{money(service.price)} · {service.durationMinutes} min</small></button>)}</div></div><div className="field full"><label>Barber</label><div className="option-grid">{barbers.map((barber) => <button type="button" className={`option ${barber.id === barberId ? 'selected' : ''}`} onClick={() => setBarberId(barber.id)} key={barber.id} data-testid={`button-booking-barber-${barber.id}`}><strong>{barber.name}</strong><small>{barber.specialty}</small></button>)}</div></div><div className="field"><label htmlFor="booking-date">Date</label><input id="booking-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} data-testid="input-booking-date" /></div></div>}
      {step === 2 && <><div className="notice"><CalendarDays size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />{chosenService?.name} with {chosenBarber?.name} on {new Date(`${date}T12:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</div>{availability.isLoading ? <div className="loading-block"><div className="skeleton" style={{ width: '70%' }} /></div> : availability.isError ? <div className="notice">We couldn’t check the chairs. Try another date.</div> : availableTimes.length === 0 ? <div className="notice">The shop is closed or fully booked on this day. Go back and choose another.</div> : <div className="time-grid">{availableTimes.map((slot) => <button type="button" className={`option ${slot === time ? 'selected' : ''}`} onClick={() => setTime(slot)} key={slot} data-testid={`button-time-${slot}`}><strong>{slot}</strong></button>)}</div>}</>}
      {step === 3 && <div className="field-grid"><div className="field full"><label htmlFor="booking-name">Full name</label><input id="booking-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" data-testid="input-booking-name" /></div><div className="field"><label htmlFor="booking-email">Email</label><input id="booking-email" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} autoComplete="email" data-testid="input-booking-email" /></div><div className="field"><label htmlFor="booking-phone">Phone</label><input id="booking-phone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" data-testid="input-booking-phone" /></div><div className="field full"><label htmlFor="booking-notes">Anything we should know? <span className="muted">(optional)</span></label><textarea id="booking-notes" value={notes} onChange={(event) => setNotes(event.target.value)} data-testid="input-booking-notes" /></div></div>}
      {step === 4 && <><div className="notice"><strong>{chosenService?.name}</strong><br />{chosenBarber?.name} · {new Date(`${date}T12:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {time}</div><div className="field" style={{ maxWidth: 410 }}><label htmlFor="promotion-code">Promotion code</label><div style={{ display: 'flex', gap: 8 }}><input id="promotion-code" value={promotionCode} onChange={(event) => setPromotionCode(event.target.value.toUpperCase())} placeholder="FIRSTCUT10" data-testid="input-promotion-code" /><button className="btn btn-line" type="button" onClick={validateCode} disabled={promotion.isPending} data-testid="button-validate-promotion">{promotion.isPending ? 'Checking…' : 'Apply'}</button></div>{promoMessage && <span className={promoPercent ? '' : 'error-note'} style={promoPercent ? { color: 'hsl(var(--accent))', fontSize: '.76rem' } : undefined}>{promoMessage}</span>}</div><div className="summary"><div className="summary-line"><span>{chosenService?.name}</span><span>{money(chosenService?.price ?? 0)}</span></div>{promoPercent > 0 && <div className="summary-line" style={{ color: 'hsl(var(--accent))' }}><span>First visit · {promoPercent}%</span><span>− {money(discount)}</span></div>}<div className="summary-line total"><span>Total</span><span>{money((chosenService?.price ?? 0) - discount)}</span></div></div></>}
      {formError && <p className="error-note" role="alert">{formError}</p>}
      <div className="form-actions">{step > 1 && <button className="btn btn-line" type="button" onClick={() => setStep((current) => current - 1)} data-testid="button-booking-back"><ChevronLeft size={14} /> Back</button>}<span />{step < 4 && <button className="btn btn-dark" type="button" onClick={goNext} data-testid="button-booking-next">Continue <ChevronRight size={14} /></button>}{step === 4 && <button className="btn btn-bronze" type="button" onClick={submitBooking} disabled={booking.isPending} data-testid="button-confirm-booking">{booking.isPending ? 'Reserving…' : 'Reserve chair'} <Check size={14} /></button>}</div>
    </>}
     {step === 5 && confirmation && <div className="confirmation"><div className="check"><Check /></div><div className="eyebrow" style={{ justifyContent: 'center' }}>Chair reserved</div><h2>You’re on<br /><em>the list.</em></h2><p className="reference">REFERENCE · {confirmation.reference}</p><p className="muted">Your booking is saved. Complete either calendar action below to add it to your calendar; opening a link or downloading a file does not save it automatically.</p><div className="confirm-details"><div><span>Service</span><strong>{confirmation.service.name}</strong></div><div><span>Barber</span><strong>{confirmation.barber.name}</strong></div><div><span>When</span><strong>{new Date(`${confirmation.date}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })} · {confirmation.time}–{confirmation.endTime}</strong></div><div><span>Where</span><strong>{confirmation.location}</strong></div><div><span>Total</span><strong>{money(confirmation.total)}</strong></div></div><div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10 }}><a className="btn btn-dark" href={googleCalendar} target="_blank" rel="noreferrer" data-testid="link-google-calendar">Google Calendar <CalendarDays size={14} /></a><button className="btn btn-line" onClick={addToAppleCalendar} data-testid="button-apple-calendar">Apple Calendar <CalendarDays size={14} /></button></div></div>}
  </div></div></section></main></>;
}

function Legal({ privacy = false }: { privacy?: boolean }) {
  const title = privacy ? 'Privacy, plainly.' : 'The fine print.';
  return <><Meta title={privacy ? 'Privacy' : 'Terms'} description={`${privacy ? 'Privacy' : 'Terms'} for CROWN & BLADE.`} /><main><PageHero eyebrow={privacy ? 'Your information' : 'Before your visit'} title={<>{title}</>} /><article className="legal">{privacy ? <><h2>What we collect</h2><p>When you book or send an enquiry, we collect the details needed to provide that service: your name, email address, phone number, appointment details and any note you choose to share.</p><h2>What we do with it</h2><p>We use your information to manage your appointment, respond to your message and contact you about a booking. We do not sell your details or use them to invent a mailing list.</p><h2>Who can see it</h2><p>Booking and enquiry details are private operational records. They are not displayed to public visitors or included in availability responses.</p><h2>Keeping it safe</h2><p>Your information is held for as long as it is useful for the service, then removed in line with our operational needs. If you would like to ask what we hold or raise a privacy enquiry, use the private enquiry form.</p></> : <><h2>Appointments</h2><p>Booking a chair creates a request for the selected service, barber, date and time. An appointment is confirmed once the booking response is successful. Please arrive a few minutes early.</p><h2>Lateness</h2><p>If you are running late, let us know through the private enquiry form. A late arrival may need a shorter service so the next appointment can start on time.</p><h2>Changes, cancellations & no-shows</h2><p>If plans change, contact the shop as soon as possible so we can release the chair to someone else. Repeated late cancellations or no-shows may make future booking requests harder to accommodate. No automatic refunds or payments are processed through this website.</p><h2>Prices & promotion</h2><p>Prices shown on the service menu are in South African rand. The FIRSTCUT10 offer gives 10% off an eligible first booking when the code is accepted during booking. Discounts are rounded to the nearest rand and cannot be combined with another offer.</p><h2>Contact</h2><p>For appointment questions, changes or privacy enquiries, use the private enquiry form. The shop does not claim that a message has been emailed or that an appointment has been added to your calendar until you complete those actions yourself.</p></>}</article></main></>;
}

function NotFound() { return <><Meta title="Page not found" description="This page could not be found." /><main className="not-found"><div><div className="eyebrow" style={{ justifyContent: 'center' }}>A wrong turn</div><h1>404</h1><p className="body-large muted">This page has left the shop.</p><Link className="btn btn-dark" href="/" data-testid="link-404-home">Back to the front door <ArrowRight size={14} /></Link></div></main></>; }

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Shell>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/services" component={Services} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/booking" component={Booking} />
          <Route path="/terms"><Legal /></Route>
          <Route path="/privacy"><Legal privacy /></Route>
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
