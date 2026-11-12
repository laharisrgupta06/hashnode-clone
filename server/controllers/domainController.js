import crypto from 'crypto';
import { promises as dns } from 'dns';
import mongoose from 'mongoose';
import Domain from '../models/Domain.js';
import Publication from '../models/Publication.js';
import { getOwnedPublication } from './publicationController.js';
import { checkHostname } from '../utils/publicationRules.js';

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// The TXT record an owner must add to prove they control a domain:
//   name:  _devpress.<hostname>      value: devpress-verify=<token>
export const recordName = (hostname) => `_devpress.${hostname}`;
export const recordValue = (token) => `devpress-verify=${token}`;

const toResponse = (d) => ({
  _id: d._id,
  hostname: d.hostname,
  status: d.status,
  isPrimary: d.isPrimary,
  lastCheckedAt: d.lastCheckedAt,
  verifiedAt: d.verifiedAt,
  lastError: d.lastError,
  record: { type: 'TXT', name: recordName(d.hostname), value: recordValue(d.verificationToken) },
  createdAt: d.createdAt,
});

// The platform's own domain is configured by environment, never assumed (PLATFORM_DOMAIN, optional).
export const getDomainConfig = (req, res) => {
  res.json({ platformDomain: process.env.PLATFORM_DOMAIN || null });
};

// GET /api/publications/:slug/domains   (owner)
export const listDomains = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const domains = await Domain.find({ publication: pub._id }).sort({ createdAt: 1 });
  res.json({ domains: domains.map(toResponse) });
};

// POST /api/publications/:slug/domains   (owner)   body: { hostname }
export const addDomain = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const raw = (req.body ?? {}).hostname;
  const hostname = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\.$/, '') : raw;
  const problem = checkHostname(hostname);
  if (problem) fail(res, 400, problem);
  const platform = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
  if (platform && (hostname === platform || hostname.endsWith(`.${platform}`))) fail(res, 400, 'Addresses on the platform domain are assigned automatically');
  if (await Domain.exists({ hostname })) fail(res, 409, 'That domain is already registered on DevPress');
  if ((await Domain.countDocuments({ publication: pub._id })) >= 3) fail(res, 400, 'A publication can have at most 3 custom domains');
  try {
    const domain = await Domain.create({ publication: pub._id, hostname, verificationToken: crypto.randomBytes(16).toString('hex') });
    res.status(201).json({ domain: toResponse(domain) });
  } catch (error) {
    if (error.code === 11000) fail(res, 409, 'That domain is already registered on DevPress');
    throw error;
  }
};

const findOwnedDomain = async (req, res, pub) => {
  if (!mongoose.isValidObjectId(req.params.domainId)) fail(res, 404, 'Domain not found');
  const domain = await Domain.findOne({ _id: req.params.domainId, publication: pub._id });
  if (!domain) fail(res, 404, 'Domain not found');
  return domain;
};

// POST /api/publications/:slug/domains/:domainId/verify   (owner)
// Performs a REAL DNS lookup of the TXT record. Only a matching record marks the domain verified.
export const verifyDomain = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const domain = await findOwnedDomain(req, res, pub);
  const expected = recordValue(domain.verificationToken);
  let found = false;
  let error = '';
  try {
    const records = await dns.resolveTxt(recordName(domain.hostname));
    found = records.some((chunks) => chunks.join('') === expected);
    if (!found) error = 'A TXT record exists, but it does not contain the expected value yet.';
  } catch (err) {
    error = err.code === 'ENOTFOUND' || err.code === 'ENODATA' ? 'No TXT record was found yet. DNS changes can take up to 48 hours to appear.' : 'The DNS lookup failed. Try again in a few minutes.';
  }
  domain.lastCheckedAt = new Date();
  domain.status = found ? 'verified' : domain.status === 'verified' ? 'failed' : 'pending';
  domain.lastError = found ? '' : error;
  if (found && !domain.verifiedAt) domain.verifiedAt = new Date();
  await domain.save();
  res.json({ domain: toResponse(domain) });
};

// DELETE /api/publications/:slug/domains/:domainId   (owner)
export const removeDomain = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const domain = await findOwnedDomain(req, res, pub);
  await domain.deleteOne();
  res.json({ message: 'Domain removed', id: domain._id });
};

// GET /api/publications/resolve-host?host=...   (public)
// Which publication a host name serves: <slug>.<PLATFORM_DOMAIN>, or a VERIFIED custom domain.
// Used by the client to render a publication website at the root of its own domain.
export const resolveHost = async (req, res) => {
  const host = typeof req.query.host === 'string' ? req.query.host.trim().toLowerCase().replace(/:\d+$/, '') : '';
  if (!host) fail(res, 400, 'Missing host');
  const platform = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
  if (platform && host.endsWith(`.${platform}`)) {
    const sub = host.slice(0, -platform.length - 1);
    const pub = await Publication.findOne({ slug: sub }).select('slug');
    return res.json({ slug: pub?.slug ?? null, via: 'platform' });
  }
  const domain = await Domain.findOne({ hostname: host, status: 'verified' }).populate('publication', 'slug');
  res.json({ slug: domain?.publication?.slug ?? null, via: domain ? 'custom' : null });
};
