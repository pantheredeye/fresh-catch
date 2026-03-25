-- Add CHECK constraints via triggers for enum-like string fields
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT CHECK, so we use triggers

-- Organization.type: 'individual' | 'business'
CREATE TRIGGER chk_organization_type_insert
  BEFORE INSERT ON Organization
  WHEN NEW.type NOT IN ('individual', 'business')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Organization.type: must be individual or business');
END;

CREATE TRIGGER chk_organization_type_update
  BEFORE UPDATE OF type ON Organization
  WHEN NEW.type NOT IN ('individual', 'business')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Organization.type: must be individual or business');
END;

-- Organization.feeModel: 'customer' | 'vendor' | 'split'
CREATE TRIGGER chk_organization_fee_model_insert
  BEFORE INSERT ON Organization
  WHEN NEW.feeModel NOT IN ('customer', 'vendor', 'split')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Organization.feeModel: must be customer, vendor, or split');
END;

CREATE TRIGGER chk_organization_fee_model_update
  BEFORE UPDATE OF feeModel ON Organization
  WHEN NEW.feeModel NOT IN ('customer', 'vendor', 'split')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Organization.feeModel: must be customer, vendor, or split');
END;

-- Membership.role: 'owner' | 'manager' | 'customer'
CREATE TRIGGER chk_membership_role_insert
  BEFORE INSERT ON Membership
  WHEN NEW.role NOT IN ('owner', 'manager', 'customer')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Membership.role: must be owner, manager, or customer');
END;

CREATE TRIGGER chk_membership_role_update
  BEFORE UPDATE OF role ON Membership
  WHEN NEW.role NOT IN ('owner', 'manager', 'customer')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Membership.role: must be owner, manager, or customer');
END;

-- Order.status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
CREATE TRIGGER chk_order_status_insert
  BEFORE INSERT ON "Order"
  WHEN NEW.status NOT IN ('pending', 'confirmed', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Order.status: must be pending, confirmed, completed, or cancelled');
END;

CREATE TRIGGER chk_order_status_update
  BEFORE UPDATE OF status ON "Order"
  WHEN NEW.status NOT IN ('pending', 'confirmed', 'completed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Order.status: must be pending, confirmed, completed, or cancelled');
END;

-- Invite.status: 'pending' | 'accepted' | 'revoked'
CREATE TRIGGER chk_invite_status_insert
  BEFORE INSERT ON Invite
  WHEN NEW.status NOT IN ('pending', 'accepted', 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Invite.status: must be pending, accepted, or revoked');
END;

CREATE TRIGGER chk_invite_status_update
  BEFORE UPDATE OF status ON Invite
  WHEN NEW.status NOT IN ('pending', 'accepted', 'revoked')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Invite.status: must be pending, accepted, or revoked');
END;

-- Invite.role: 'owner' | 'manager'
CREATE TRIGGER chk_invite_role_insert
  BEFORE INSERT ON Invite
  WHEN NEW.role NOT IN ('owner', 'manager')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Invite.role: must be owner or manager');
END;

CREATE TRIGGER chk_invite_role_update
  BEFORE UPDATE OF role ON Invite
  WHEN NEW.role NOT IN ('owner', 'manager')
BEGIN
  SELECT RAISE(ABORT, 'Invalid Invite.role: must be owner or manager');
END;
