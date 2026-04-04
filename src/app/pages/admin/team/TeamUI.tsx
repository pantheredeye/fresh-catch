"use client";

import { useState, useTransition } from "react";
import { Button, SectionHeader, Badge, Select } from "@/design-system";
import { createInvite, revokeInvite, changeRole, removeMember } from "./team-functions";
import "./team.css";

type Member = {
  id: string;
  role: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type PendingInvite = {
  id: string;
  email: string | null;
  role: string;
  token: string;
  createdAt: string;
};

export function TeamUI({
  members,
  pendingInvites,
  currentUserId,
  baseUrl,
  csrfToken,
}: {
  members: Member[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
  baseUrl: string;
  csrfToken: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("manager");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateInvite = () => {
    setError(null);
    startTransition(async () => {
      const result = await createInvite(csrfToken, {
        email: inviteEmail || undefined,
        role: inviteRole,
      });
      if (result.success && result.invite) {
        const link = `${baseUrl}/join/invite?token=${result.invite.token}`;
        setNewInviteLink(link);
        setInviteEmail("");
      } else {
        setError(result.error || "Failed to create invite");
      }
    });
  };

  const handleRevokeInvite = (inviteId: string) => {
    startTransition(async () => {
      await revokeInvite(csrfToken, inviteId);
    });
  };

  const handleChangeRole = (membershipId: string, newRole: string) => {
    setError(null);
    startTransition(async () => {
      const result = await changeRole(csrfToken, membershipId, newRole);
      if (!result.success) {
        setError(result.error || "Failed to change role");
      }
    });
  };

  const handleRemoveMember = (membershipId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeMember(csrfToken, membershipId);
      if (!result.success) {
        setError(result.error || "Failed to remove member");
      }
    });
  };

  const copyToClipboard = async (text: string, token: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="team-page">
      <div className="team-header">
        <h1 className="team-title">Team</h1>
        <p className="team-subtitle">Manage who can access your admin area</p>
      </div>

      {error && (
        <div className="team-error">{error}</div>
      )}

      {/* Invite section */}
      <div className="team-actions">
        {!showInviteForm && !newInviteLink && (
          <Button variant="primary" size="lg" fullWidth onClick={() => setShowInviteForm(true)}>
            + Invite Team Member
          </Button>
        )}

        {showInviteForm && !newInviteLink && (
          <div className="invite-form">
            <h3 className="invite-form__title">Create Invite Link</h3>
            <div className="invite-form__field">
              <label className="invite-form__label">Email (optional)</label>
              <input
                type="email"
                className="invite-form__input"
                placeholder="their@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <span className="invite-form__hint">Just for your reference — they'll get a link to share</span>
            </div>
            <div className="invite-form__field">
              <label className="invite-form__label">Role</label>
              <select
                className="invite-form__select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="manager">Manager — can manage orders & schedules</option>
                <option value="owner">Owner — full access including team management</option>
              </select>
            </div>
            <div className="invite-form__actions">
              <Button variant="primary" onClick={handleCreateInvite} disabled={isPending}>
                {isPending ? "Creating..." : "Create Link"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowInviteForm(false); setInviteEmail(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {newInviteLink && (
          <div className="invite-success">
            <h3 className="invite-success__title">Invite link created!</h3>
            <p className="invite-success__hint">Copy this link and send it to your team member:</p>
            <div className="invite-success__link-row">
              <input
                type="text"
                className="invite-success__link"
                value={newInviteLink}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => copyToClipboard(newInviteLink, "new")}
              >
                {copiedToken === "new" ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => { setNewInviteLink(null); setShowInviteForm(false); }}
            >
              Done
            </Button>
          </div>
        )}
      </div>

      {/* Current members */}
      <SectionHeader>Team Members ({members.length})</SectionHeader>
      <div className="team-members">
        {members.map((member) => (
          <div key={member.id} className="team-member">
            <div className="team-member__info">
              <div className="team-member__name">
                {member.userName}
                {member.userId === currentUserId && (
                  <span className="team-member__you"> (you)</span>
                )}
              </div>
              <div className="team-member__email">{member.userEmail}</div>
            </div>
            <div className="team-member__actions">
              <select
                className="team-member__role-select"
                value={member.role}
                onChange={(e) => handleChangeRole(member.id, e.target.value)}
                disabled={isPending}
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
              </select>
              {member.userId !== currentUserId && (
                <button
                  className="team-member__remove"
                  onClick={() => handleRemoveMember(member.id, member.userName)}
                  disabled={isPending}
                  title="Remove member"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <>
          <SectionHeader>Pending Invites ({pendingInvites.length})</SectionHeader>
          <div className="team-invites">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="team-invite">
                <div className="team-invite__info">
                  <div className="team-invite__label">
                    {invite.email || "Link invite"}
                  </div>
                  <div className="team-invite__meta">
                    {invite.role} · {new Date(invite.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="team-invite__actions">
                  <button
                    className="team-invite__copy"
                    onClick={() =>
                      copyToClipboard(
                        `${baseUrl}/join/invite?token=${invite.token}`,
                        invite.token
                      )
                    }
                  >
                    {copiedToken === invite.token ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    className="team-invite__revoke"
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={isPending}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
