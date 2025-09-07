(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-GOAL u101)
(define-constant ERR-INVALID-DEADLINE u102)
(define-constant ERR-INVALID-DESCRIPTION u103)
(define-constant ERR-INVALID-TITLE u104)
(define-constant ERR-CAMPAIGN-ALREADY-EXISTS u105)
(define-constant ERR-CAMPAIGN-NOT-FOUND u106)
(define-constant ERR-CAMPAIGN-ENDED u107)
(define-constant ERR-CAMPAIGN-NOT-ENDED u108)
(define-constant ERR-INSUFFICIENT-CONTRIBUTION u109)
(define-constant ERR-NO-CONTRIBUTIONS u110)
(define-constant ERR-GOAL-NOT-MET u111)
(define-constant ERR-GOAL-MET u112)
(define-constant ERR-INVALID-OWNER u113)
(define-constant ERR-INVALID-CONTRIBUTOR u114)
(define-constant ERR-INVALID-STATUS u115)
(define-constant ERR-MAX-CAMPAIGNS-EXCEEDED u116)
(define-constant ERR-INVALID-MIN-CONTRIBUTION u117)
(define-constant ERR-INVALID-MAX-CONTRIBUTION u118)
(define-constant ERR-INVALID-REWARD-TIER u119)
(define-constant ERR-INVALID-UPDATE u120)
(define-constant ERR-TRANSFER-FAILED u121)
(define-constant ERR-REFUND-FAILED u122)
(define-constant ERR-WITHDRAW-FAILED u123)
(define-constant ERR-INVALID-TIMESTAMP u124)
(define-constant ERR-CAMPAIGN-ACTIVE u125)
(define-constant ERR-INVALID-PROJECT-ID u126)
(define-constant ERR-PROJECT-NOT-VERIFIED u127)
(define-constant ERR-INVALID-REWARD-DESCRIPTION u128)
(define-constant ERR-INVALID-REWARD-THRESHOLD u129)
(define-constant ERR-REWARD-ALREADY-CLAIMED u130)

(define-data-var next-campaign-id uint u0)
(define-data-var max-campaigns uint u500)
(define-data-var min-contribution uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map campaigns
  uint
  {
    title: (string-utf8 100),
    description: (string-utf8 1000),
    goal: uint,
    deadline: uint,
    owner: principal,
    total-contributed: uint,
    status: (string-ascii 20),
    project-id: uint,
    reward-tiers: (list 10 {threshold: uint, description: (string-utf8 200)})
  }
)

(define-map contributions
  {campaign-id: uint, contributor: principal}
  uint
)

(define-map campaign-updates
  uint
  {
    update-description: (string-utf8 1000),
    update-timestamp: uint,
    updater: principal
  }
)

(define-map claimed-rewards
  {campaign-id: uint, contributor: principal, tier-index: uint}
  bool
)

(define-read-only (get-campaign (id uint))
  (map-get? campaigns id)
)

(define-read-only (get-contribution (campaign-id uint) (contributor principal))
  (map-get? contributions {campaign-id: campaign-id, contributor: contributor})
)

(define-read-only (get-campaign-update (id uint))
  (map-get? campaign-updates id)
)

(define-read-only (get-claimed-reward (campaign-id uint) (contributor principal) (tier-index uint))
  (map-get? claimed-rewards {campaign-id: campaign-id, contributor: contributor, tier-index: tier-index})
)

(define-read-only (is-campaign-active (id uint))
  (let ((campaign (unwrap! (get-campaign id) false)))
    (and (< block-height (get deadline campaign))
         (is-eq (get status campaign) "active"))))

(define-private (validate-title (title (string-utf8 100)))
  (if (> (len title) u0)
      (ok true)
      (err ERR-INVALID-TITLE)))

(define-private (validate-description (desc (string-utf8 1000)))
  (if (> (len desc) u0)
      (ok true)
      (err ERR-INVALID-DESCRIPTION)))

(define-private (validate-goal (goal uint))
  (if (> goal u0)
      (ok true)
      (err ERR-INVALID-GOAL)))

(define-private (validate-deadline (deadline uint))
  (if (> deadline block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE)))

(define-private (validate-min-contribution (amount uint))
  (if (>= amount (var-get min-contribution))
      (ok true)
      (err ERR-INSUFFICIENT-CONTRIBUTION)))

(define-private (validate-reward-tiers (tiers (list 10 {threshold: uint, description: (string-utf8 200)})))
  (fold validate-reward-tier tiers (ok true)))

(define-private (validate-reward-tier (tier {threshold: uint, description: (string-utf8 200)}) (acc (response bool uint)))
  (match acc
    ok-val
    (if (and (> (get threshold tier) u0) (> (len (get description tier)) u0))
        (ok true)
        (err ERR-INVALID-REWARD-TIER))
    err-val acc))

(define-private (validate-project-id (project-id uint))
  (ok true))

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-NOT-AUTHORIZED))
    (ok (var-set authority-contract (some contract-principal)))))

(define-public (set-max-campaigns (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-NOT-AUTHORIZED))) (err ERR-NOT-AUTHORIZED))
    (ok (var-set max-campaigns new-max))))

(define-public (set-min-contribution (new-min uint))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-NOT-AUTHORIZED))) (err ERR-NOT-AUTHORIZED))
    (ok (var-set min-contribution new-min))))

(define-public (create-campaign
  (title (string-utf8 100))
  (description (string-utf8 1000))
  (goal uint)
  (deadline uint)
  (project-id uint)
  (reward-tiers (list 10 {threshold: uint, description: (string-utf8 200)})))
  (let ((next-id (var-get next-campaign-id)))
    (asserts! (< next-id (var-get max-campaigns)) (err ERR-MAX-CAMPAIGNS-EXCEEDED))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-goal goal))
    (try! (validate-deadline deadline))
    (try! (validate-reward-tiers reward-tiers))
    (try! (validate-project-id project-id))
    (map-set campaigns next-id
      {
        title: title,
        description: description,
        goal: goal,
        deadline: deadline,
        owner: tx-sender,
        total-contributed: u0,
        status: "active",
        project-id: project-id,
        reward-tiers: reward-tiers
      })
    (var-set next-campaign-id (+ next-id u1))
    (print { event: "campaign-created", id: next-id })
    (ok next-id)))

(define-public (contribute (campaign-id uint) (amount uint))
  (let ((campaign (unwrap! (get-campaign campaign-id) (err ERR-CAMPAIGN-NOT-FOUND)))
        (current-contrib (default-to u0 (get-contribution campaign-id tx-sender))))
    (asserts! (is-campaign-active campaign-id) (err ERR-CAMPAIGN-ENDED))
    (try! (validate-min-contribution amount))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set contributions {campaign-id: campaign-id, contributor: tx-sender} (+ current-contrib amount))
    (map-set campaigns campaign-id
      (merge campaign {total-contributed: (+ (get total-contributed campaign) amount)}))
    (print { event: "contribution-made", campaign-id: campaign-id, amount: amount })
    (ok true)))

(define-public (withdraw-funds (campaign-id uint))
  (let ((campaign (unwrap! (get-campaign campaign-id) (err ERR-CAMPAIGN-NOT-FOUND))))
    (asserts! (is-eq tx-sender (get owner campaign)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> block-height (get deadline campaign)) (err ERR-CAMPAIGN-ACTIVE))
    (asserts! (>= (get total-contributed campaign) (get goal campaign)) (err ERR-GOAL-NOT-MET))
    (asserts! (is-eq (get status campaign) "active") (err ERR-INVALID-STATUS))
    (try! (as-contract (stx-transfer? (get total-contributed campaign) tx-sender (get owner campaign))))
    (map-set campaigns campaign-id (merge campaign {status: "funded"}))
    (print { event: "funds-withdrawn", campaign-id: campaign-id })
    (ok true)))

(define-public (refund (campaign-id uint))
  (let ((campaign (unwrap! (get-campaign campaign-id) (err ERR-CAMPAIGN-NOT-FOUND)))
        (contrib-amount (unwrap! (get-contribution campaign-id tx-sender) (err ERR-NO-CONTRIBUTIONS))))
    (asserts! (> block-height (get deadline campaign)) (err ERR-CAMPAIGN-ACTIVE))
    (asserts! (< (get total-contributed campaign) (get goal campaign)) (err ERR-GOAL-MET))
    (asserts! (is-eq (get status campaign) "active") (err ERR-INVALID-STATUS))
    (try! (as-contract (stx-transfer? contrib-amount tx-sender tx-sender)))
    (map-delete contributions {campaign-id: campaign-id, contributor: tx-sender})
    (map-set campaigns campaign-id
      (merge campaign {total-contributed: (- (get total-contributed campaign) contrib-amount), status: "failed"}))
    (print { event: "refund-issued", campaign-id: campaign-id, amount: contrib-amount })
    (ok true)))

(define-public (update-campaign-description (campaign-id uint) (new-description (string-utf8 1000)))
  (let ((campaign (unwrap! (get-campaign campaign-id) (err ERR-CAMPAIGN-NOT-FOUND))))
    (asserts! (is-eq tx-sender (get owner campaign)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-campaign-active campaign-id) (err ERR-CAMPAIGN-ENDED))
    (try! (validate-description new-description))
    (map-set campaigns campaign-id (merge campaign {description: new-description}))
    (map-set campaign-updates campaign-id
      {update-description: new-description, update-timestamp: block-height, updater: tx-sender})
    (print { event: "campaign-updated", id: campaign-id })
    (ok true)))

(define-public (claim-reward (campaign-id uint) (tier-index uint))
  (let ((campaign (unwrap! (get-campaign campaign-id) (err ERR-CAMPAIGN-NOT-FOUND)))
        (contrib-amount (unwrap! (get-contribution campaign-id tx-sender) (err ERR-NO-CONTRIBUTIONS)))
        (tiers (get reward-tiers campaign))
        (tier (unwrap! (element-at? tiers tier-index) (err ERR-INVALID-REWARD-TIER))))
    (asserts! (> block-height (get deadline campaign)) (err ERR-CAMPAIGN-ACTIVE))
    (asserts! (>= (get total-contributed campaign) (get goal campaign)) (err ERR-GOAL-NOT-MET))
    (asserts! (>= contrib-amount (get threshold tier)) (err ERR-INSUFFICIENT-CONTRIBUTION))
    (asserts! (not (default-to false (get-claimed-reward campaign-id tx-sender tier-index))) (err ERR-REWARD-ALREADY-CLAIMED))
    (map-set claimed-rewards {campaign-id: campaign-id, contributor: tx-sender, tier-index: tier-index} true)
    (print { event: "reward-claimed", campaign-id: campaign-id, tier-index: tier-index })
    (ok true)))

(define-public (get-campaign-count)
  (ok (var-get next-campaign-id)))

(define-public (get-min-contribution)
  (ok (var-get min-contribution)))