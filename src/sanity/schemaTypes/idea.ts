import { defineField, defineType } from 'sanity'

export const ideaSchema = defineType({
  name: 'idea',
  title: 'Idea Bank',
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
          { title: 'YouTube', value: 'youtube' },
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Twitter/X', value: 'twitter' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'Coding Blog', value: 'blog' },
          { title: 'General Note', value: 'general' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Idea', value: 'idea' },
          { title: 'Scripting', value: 'scripting' },
          { title: 'Recording', value: 'recording' },
          { title: 'Editing', value: 'editing' },
          { title: 'Ready to Post', value: 'ready' },
          { title: 'Posted', value: 'posted' },
        ],
      },
      initialValue: 'idea',
    }),
    defineField({
      name: 'script',
      title: 'Script / Content Outline',
      type: 'text',
    }),
    defineField({
      name: 'publishDate',
      title: 'Scheduled Publish Date',
      type: 'datetime',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})
