import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  listPublications, checkSlugAvailability, getMyPublications, createPublication, getPublication,
  getPublicationPosts, getPublicationPost, getManagedPublication, getManagedPosts, updatePublication,
} from '../controllers/publicationController.js';
import { getDomainConfig, listDomains, addDomain, verifyDomain, removeDomain, resolveHost } from '../controllers/domainController.js';

const router = express.Router();

// Fixed paths first, so they are never mistaken for a publication slug (they are also reserved slugs).
router.get('/', listPublications);
router.post('/', protect, createPublication);
router.get('/check-slug', checkSlugAvailability);
router.get('/mine', protect, getMyPublications);
router.get('/resolve-host', resolveHost);
router.get('/domain-config', getDomainConfig);

// Owner-only management
router.get('/:slug/manage', protect, getManagedPublication);
router.get('/:slug/manage/posts', protect, getManagedPosts);
router.put('/:slug', protect, updatePublication);
router.get('/:slug/domains', protect, listDomains);
router.post('/:slug/domains', protect, addDomain);
router.post('/:slug/domains/:domainId/verify', protect, verifyDomain);
router.delete('/:slug/domains/:domainId', protect, removeDomain);

// Public publication website data
router.get('/:slug', getPublication);
router.get('/:slug/posts', getPublicationPosts);
router.get('/:slug/posts/:postSlug', getPublicationPost);

export default router;
