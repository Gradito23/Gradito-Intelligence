/**
 * Shared P&L helper — single source of truth for event profitability.
 * All views (EventDetailPanel, Profitability page, Reports) must use this.
 */
import { computePnL } from '@/lib/pnlUtils';

/**
 * @param {object} event  — Event entity record
 * @param {Array}  eventChefsAll — full EventChef list (filtered internally by event_id)
 * @returns Full P&L object including chefPay
 */
export function computeEventPnL(event, eventChefsAll = [], commissionLines = []) {
  const assignments = eventChefsAll.filter(ec => ec.event_id === event.id);
  const chefPay = assignments.reduce((s, ec) => s + (ec.fee || 0) + (ec.travel_fee_applied || 0), 0);
  const eventCommLines = commissionLines.filter(cl => cl.event_id === event.id);
  const commissionOwed = eventCommLines.reduce((s, cl) => s + (cl.amount || 0), 0);
  const pnl = computePnL(event, chefPay, commissionOwed);
  return { chefPay, commissionOwed, ...pnl };
}