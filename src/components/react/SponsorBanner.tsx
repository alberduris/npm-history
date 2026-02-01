import sponsorData from '../../data/sponsors.json';

interface Sponsor {
  name: string;
  description: string;
  url: string;
  image: string;
  active: boolean;
}

export default function SponsorBanner() {
  const sponsor = (sponsorData.sponsors as Sponsor[]).find(s => s.active);
  if (!sponsor) return null;

  return (
    <div className="w-full mt-8 flex flex-col justify-center items-center text-center">
      <p className="mb-2 text-sm text-gray-600">
        <a
          target="_blank"
          rel="noopener sponsored"
          href={sponsor.url}
        >
          <span className="text-blue-500 hover:opacity-80 underline">{sponsor.name}</span>
        </a>
        {' '}- {sponsor.description}
      </p>
      <a target="_blank" rel="noopener sponsored" href={sponsor.url}>
        <div className="hover:opacity-80">
          <img
            className="w-auto max-w-full rounded"
            src={sponsor.image}
            alt={sponsor.name}
            loading="lazy"
          />
        </div>
      </a>
    </div>
  );
}
