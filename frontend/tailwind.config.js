/** @type {import('tailwindcss').Config} */
export default {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: '#4f46e5',
          secondary: '#6366f1',
          accent: '#4338ca',
          background: '#f9fafb',
          surface: '#ffffff',
          border: '#e5e7eb',
        },
      },
    },
    plugins: [
      await import('@tailwindcss/typography'),
      await import('daisyui')
    ],
  }
  