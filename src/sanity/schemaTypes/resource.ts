import { defineField, defineType } from 'sanity'

export const resourceSchema = defineType({
  name: 'resource',
  title: 'Learning Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Frontend', value: 'frontend' },
          { title: 'Backend', value: 'backend' },
          { title: 'Fullstack', value: 'fullstack' },
          { title: 'DSA & Algorithms', value: 'dsa' },
          { title: 'DevOps & Cloud', value: 'devops' },
          { title: 'Database', value: 'database' },
          { title: 'System Design', value: 'system-design' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'External Resource Link (URL)',
      type: 'url',
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
    }),
    defineField({
      name: 'notes',
      title: 'Detailed Notes',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'difficulty',
      title: 'Difficulty Level',
      type: 'string',
      options: {
        list: [
          { title: 'Beginner', value: 'beginner' },
          { title: 'Intermediate', value: 'intermediate' },
          { title: 'Advanced', value: 'advanced' },
        ],
      },
      initialValue: 'beginner',
    }),
  ],
})
