import ChatInterface from '../components/ChatInterface';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>Research Navigator</title>
        <meta name="description" content="Research Navigator - Your AI research assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <ChatInterface />
      </main>
    </>
  );
}