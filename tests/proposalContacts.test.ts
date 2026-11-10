import assert from 'node:assert/strict';
import { resolveCustomerContactName } from '../src/lib/proposalContacts';
assert.equal(resolveCustomerContactName('Atakan Zehir', ['Atakan Zehir'], 'Semanur Demirel'), 'Semanur Demirel');
assert.equal(resolveCustomerContactName(' Atakan   Zehir ', ['ATAKAN ZEHİR']), '');
assert.equal(resolveCustomerContactName('Semanur Demirel', ['Atakan Zehir'], 'Başka Yetkili'), 'Semanur Demirel');
assert.equal(resolveCustomerContactName('', ['Atakan Zehir'], 'Semanur Demirel'), '');
assert.equal(resolveCustomerContactName('Atakan Zehir', ['Atakan Zehir'], 'Atakan Zehir'), '');
console.log('5 customer-signatory checks passed.');
