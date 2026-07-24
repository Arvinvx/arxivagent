/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at top, rgba(91, 140, 255, 0.22), transparent 42%), radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.15), transparent 28%), linear-gradient(180deg, #07111f 0%, #050a12 100%)',
      },
    },
  },
  plugins: [],
}