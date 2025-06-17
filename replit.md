# Educational Lecture Platform

## Overview

This is a client-side educational lecture platform built as a static web application. It provides an interactive interface for displaying course content organized into structured lectures with markdown-based content. The platform uses a simple Python HTTP server for local development and can be deployed as static files.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Pure HTML, CSS, and JavaScript (vanilla)
- **UI Framework**: Custom CSS with Bootstrap Icons for visual elements
- **Content Rendering**: Marked.js for markdown parsing and Highlight.js for syntax highlighting
- **Layout**: Fixed sidebar navigation with dynamic main content area
- **Responsive Design**: Modern CSS with flexbox layout

### Backend Architecture
- **Server**: Python HTTP server (development)
- **Content Storage**: Static markdown files in `/lectures` directory
- **No Database**: Content is file-based, no persistent data storage
- **No API**: Direct file loading through browser requests

## Key Components

### 1. Navigation System
- Fixed sidebar with course lecture links
- Dynamic content loading without page refresh
- Active state management for current lecture
- Icon-based navigation with Bootstrap Icons

### 2. Content Management
- Markdown-based lecture content stored in `/lectures` directory
- Real-time markdown parsing and rendering using Marked.js
- Code syntax highlighting with Highlight.js
- Structured content organization (Introduction → Getting Started → Advanced Topics → Practical Exercises)

### 3. User Interface
- Clean, educational-focused design
- Gradient sidebar with professional styling
- Responsive layout for different screen sizes
- Modern typography and spacing

### 4. Content Structure
Current lectures include:
- **Introduction**: Course overview and learning objectives
- **Getting Started**: Environment setup and fundamental concepts
- **Advanced Topics**: Complex theoretical frameworks and methodologies
- **Practical Exercises**: Hands-on application exercises

## Data Flow

1. **Initial Load**: HTML loads with default introduction content
2. **Navigation**: User clicks lecture link in sidebar
3. **Content Fetch**: JavaScript loads corresponding markdown file from `/lectures`
4. **Rendering**: Marked.js converts markdown to HTML
5. **Display**: Content replaces main area, syntax highlighting applied
6. **State Update**: Active navigation state updated

## External Dependencies

### CDN Dependencies
- **Marked.js**: Markdown parsing library
- **Highlight.js**: Code syntax highlighting
- **Bootstrap Icons**: Icon font library

### Development Dependencies
- **Python 3.11**: HTTP server for local development
- **Node.js 20**: Available for potential future enhancements

## Deployment Strategy

### Current Setup
- **Development**: Python HTTP server on port 5000
- **Production**: Static file deployment (any web server)
- **Build Process**: No build step required - direct file serving

### Deployment Options
- **Static Hosting**: GitHub Pages, Netlify, Vercel
- **Web Servers**: Apache, Nginx, or any HTTP server
- **CDN**: Content can be served through CDN for global distribution

### Advantages
- **Simplicity**: No backend infrastructure required
- **Performance**: Fast loading with minimal dependencies
- **Scalability**: Static files scale easily
- **Maintenance**: Low maintenance overhead

### Limitations
- **No User Data**: Cannot store user progress or preferences
- **No Interactive Features**: Limited to content display
- **No Authentication**: Open access only

## Changelog

- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.