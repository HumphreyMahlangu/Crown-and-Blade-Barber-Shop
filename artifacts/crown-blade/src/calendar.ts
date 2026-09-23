const BUSINESS_TIMEZONE = 'Africa/Johannesburg';

export type CalendarAppointment = {
  reference: string;
  service: { name: string };
  barber: { name: string };
  customerName: string;
  date: string;
  time: string;
  durationMinutes: number;
  location: string;
  total: number;
};

function timeFromMinutes(timeValue: string, durationMinutes: number) {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const total = hours * 60 + minutes + durationMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function localTimeToUtc(dateValue: string, timeValue: string, timeZone: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hours, minutes] = timeValue.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(localAsUtc))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = representedAsUtc - localAsUtc;
  return new Date(localAsUtc - offset);
}

function formatUtcStamp(value: Date) {
  return `${value.getUTCFullYear().toString().padStart(4, '0')}${String(value.getUTCMonth() + 1).padStart(2, '0')}${String(value.getUTCDate()).padStart(2, '0')}T${String(value.getUTCHours()).padStart(2, '0')}${String(value.getUTCMinutes()).padStart(2, '0')}${String(value.getUTCSeconds()).padStart(2, '0')}Z`;
}

function escapeIcsText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,');
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const folded: string[] = [];
  let remaining = line;
  let firstLine = true;

  while (encoder.encode(remaining).length > (firstLine ? 75 : 74)) {
    const limit = firstLine ? 75 : 74;
    let splitAt = 0;
    let bytes = 0;
    for (const character of remaining) {
      const characterBytes = encoder.encode(character).length;
      if (bytes + characterBytes > limit) break;
      bytes += characterBytes;
      splitAt += character.length;
    }
    if (splitAt === 0) break;
    folded.push(`${firstLine ? '' : ' '}${remaining.slice(0, splitAt)}`);
    remaining = remaining.slice(splitAt);
    firstLine = false;
  }
  folded.push(`${firstLine ? '' : ' '}${remaining}`);
  return folded.join('\r\n');
}

export function buildAppleCalendarIcs(appointment: CalendarAppointment, createdAt = new Date()) {
  const start = formatUtcStamp(localTimeToUtc(appointment.date, appointment.time, BUSINESS_TIMEZONE));
  const end = formatUtcStamp(localTimeToUtc(appointment.date, timeFromMinutes(appointment.time, appointment.durationMinutes), BUSINESS_TIMEZONE));
  const description = [
    `Service: ${appointment.service.name}`,
    `Barber: ${appointment.barber.name}`,
    `Reference: ${appointment.reference}`,
    `Customer: ${appointment.customerName}`,
    `Total: R ${appointment.total}`,
  ].join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Crown and Blade//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appointment.reference}@crownandblade`,
    `DTSTAMP:${formatUtcStamp(createdAt)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(`${appointment.service.name} at CROWN & BLADE`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(appointment.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function buildGoogleCalendarUrl(appointment: CalendarAppointment) {
  const endTime = timeFromMinutes(appointment.time, appointment.durationMinutes);
  const date = appointment.date.replaceAll('-', '');
  const dates = `${date}T${appointment.time.replace(':', '')}00/${date}T${endTime.replace(':', '')}00`;
  const details = [
    `Appointment for ${appointment.customerName}.`,
    `Service: ${appointment.service.name}.`,
    `Barber: ${appointment.barber.name}.`,
    `Reference: ${appointment.reference}.`,
    `Total: R ${appointment.total}.`,
    'Timezone: South African Standard Time (SAST).',
  ].join(' ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    ctz: BUSINESS_TIMEZONE,
    text: `${appointment.service.name} at CROWN & BLADE`,
    dates,
    details,
    location: appointment.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}