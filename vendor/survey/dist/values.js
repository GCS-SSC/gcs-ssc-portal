export const isCalendarDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-'))
        return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
/** Compare decimal strings at their shared scale, without rounding through JavaScript numbers. */
export const compareDecimal = (left, right) => {
    const scale = Math.max((left.split('.')[1] ?? '').length, (right.split('.')[1] ?? '').length);
    const scaled = (value) => {
        const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
        const amount = BigInt(`${whole || '0'}${fraction.padEnd(scale, '0')}`);
        return value.startsWith('-') ? -amount : amount;
    };
    const a = scaled(left), b = scaled(right);
    return a < b ? -1 : a > b ? 1 : 0;
};
