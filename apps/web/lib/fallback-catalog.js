export const fallbackCatalog = {
  home: {
    sections: [
      {
        key: "kdrama",
        title: "KDrama",
        items: [
          {
            id: "44444444-4444-4444-4444-444444444441",
            title: "Seoul Echoes",
            slug: "seoul-echoes",
            poster_url:
              "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=900&q=80",
            release_year: 2026,
            content_type: "series",
          },
          {
            id: "44444444-4444-4444-4444-444444444442",
            title: "Midnight Promise",
            slug: "midnight-promise",
            poster_url:
              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
            release_year: 2025,
            content_type: "series",
          },
        ],
      },
      {
        key: "hot-movies",
        title: "Hot Movies",
        items: [
          {
            id: "44444444-4444-4444-4444-444444444441",
            title: "Heatline",
            slug: "heatline",
            poster_url:
              "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
            release_year: 2026,
            content_type: "movie",
          },
          {
            id: "44444444-4444-4444-4444-444444444443",
            title: "Concrete Rush",
            slug: "concrete-rush",
            poster_url:
              "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
            release_year: 2024,
            content_type: "movie",
          },
        ],
      },
      {
        key: "late-night-audio",
        title: "Late Night Audio",
        items: [
          {
            id: "55555555-5555-5555-5555-555555555551",
            title: "Night Drive",
            slug: "night-drive",
            poster_url:
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
            release_year: null,
            content_type: "audio",
          },
        ],
      },
    ],
  },
  movies: [
    {
      id: "44444444-4444-4444-4444-444444444441",
      title: "Heatline",
      slug: "heatline",
      poster_url:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
      release_year: 2026,
      content_type: "movie",
    },
  ],
  movieDetails: {
    heatline: {
      id: "44444444-4444-4444-4444-444444444441",
      title: "Heatline",
      slug: "heatline",
      poster_url:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80",
      backdrop_url:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80",
      synopsis:
        "A courier outruns a citywide blackout while carrying evidence that could collapse a syndicate.",
      release_year: 2026,
      language: "en",
      content_type: "movie",
      files: [
        {
          id: "66666666-6666-6666-6666-666666666661",
          label: "Heatline 720p",
          quality: "720p",
          format: "mp4",
          file_size_bytes: 1572864000,
          requires_ad: true,
          points_cost: 10,
        },
        {
          id: "66666666-6666-6666-6666-666666666662",
          label: "Heatline 1080p",
          quality: "1080p",
          format: "mp4",
          file_size_bytes: 2147483648,
          requires_ad: true,
          points_cost: 15,
        },
      ],
    },
  },
  audio: [
    {
      id: "55555555-5555-5555-5555-555555555551",
      title: "Night Drive",
      slug: "night-drive",
      poster_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
      release_year: null,
      content_type: "audio",
    },
  ],
  audioDetails: {
    "night-drive": {
      id: "55555555-5555-5555-5555-555555555551",
      title: "Night Drive",
      slug: "night-drive",
      poster_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
      backdrop_url:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80",
      synopsis: "A synth-heavy track used to test the audio unlock flow.",
      release_year: null,
      language: "en",
      content_type: "audio",
      files: [
        {
          id: "66666666-6666-6666-6666-666666666663",
          label: "Night Drive MP3",
          quality: "320kbps",
          format: "mp3",
          file_size_bytes: 10485760,
          requires_ad: true,
          points_cost: 5,
        },
      ],
    },
  },
};
