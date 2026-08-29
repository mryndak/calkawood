import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(['domy', 'sauny', 'tarasy', 'zadaszenia', 'wnetrza']),
    location: z.string(),
    area: z.number().optional(),
    description: z.string().optional(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })),
    // Opis kadru dla realizacji bez dostarczonego zdjęcia — pokazywana zamiast
    // images (patrz PhotoPlaceholder / GalleryLightbox).
    placeholderNote: z.string().optional(),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    id: z.string(),
    author: z.string(),
    location: z.string(),
    content: z.string(),
    rating: z.number().min(1).max(5),
    date: z.coerce.date(),
  }),
});

export const collections = { projects, testimonials };
