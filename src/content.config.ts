import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(['stolarka-na-wymiar', 'tarasy', 'podlogi-i-wnetrza', 'budowa-szkieletowa']),
    description: z.string(),
    images: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    id: z.string(),
    author: z.string(),
    content: z.string(),
    rating: z.number().min(1).max(5),
    date: z.coerce.date(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    icon: z.string(),
    order: z.number(),
  }),
});

export const collections = { projects, testimonials, services };
