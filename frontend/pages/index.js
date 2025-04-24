import TimeDisplay from '../components/TimeDisplay';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Research Navigator</title>
        <meta name="description" content="Research Navigator application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <TimeDisplay />
      </main>
    </>
  );
}