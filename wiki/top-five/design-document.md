# Top-Five Feature Design

## Overview
**Purpose**: The Top-Five feature is designed to establish community consensus through a multiple-choice voting mechanism. It allows the NeuroSwarm community to collectively identify and validate the most accurate or valuable information via a gamified, recurring challenge.

**Governance & Contributor Experience**:
*   **Governance Integration**: Results act as a signal for community sentiment and consensus. High-quality consensus can influence governance parameters or content curation standards.
*   **Contributor Experience**: The feature gamifies participation. Contributors earn reputation and rewards for:
    *   Submitting high-quality questions that get selected.
    *   Voting for the "correct" (majority consensus) answer.
    *   Participating consistently in intervals.

## Question Pool
### Submission Process
*   **Interface**: Contributors access a "Submit Question" form in the Question Pool tab.
*   **Fields**:
    *   **Question Text**: Clear, unambiguous query.
    *   **Options**: 5 distinct answers (1 Correct/Best, 4 Distractors/Alternatives).
    *   **Context/Source**: Optional link or text backing up the correct answer.
    *   **Tags**: Categorization (e.g., Tech, Governance, Trivia).
    *   **Voting Duration**: Suggested time limit for the active voting phase (e.g., 24 hours). This can be a fixed system default or a parameter proposed by the submitter.
*   **Cost**: A nominal submission fee (token or reputation stake) to discourage low-effort spam.

### Voting Mechanism (Prioritization)
*   **Upvoting**: Community members view the pool and upvote questions they find valuable or interesting.
*   **Ranking**: Questions are ranked by net upvotes.
*   **Selection**: The highest-ranked question at the end of an interval is promoted to the Active state.

### Rules & Moderation
*   **Reputation Gating**: Only users with a specific reputation tier (e.g., Tier 2+) can submit questions.
*   **Spam Prevention**: Rate limits (e.g., 1 submission per user per interval).
*   **Moderation**: "Guardians" or high-rep users can flag questions for removal if they violate guidelines (offensive, factually incorrect, duplicates).

## Interval Voting
### Frequency Options
*   **Standard**: Daily (24-hour cycle).
*   **Configurable**: The system supports variable intervals (Hourly, 4-Hour, Weekly) to adapt to community activity levels.

### Community Voting on Cadence
*   **Meta-Governance**: The community can vote to change the interval speed.
    *   *Scenario*: High engagement -> Increase frequency to Hourly.
    *   *Scenario*: Low engagement -> Decrease to Weekly to ensure quality.

### Governance Logic
*   **Automatic Adjustment**: Algorithms can suggest interval changes based on "Vote Density" (votes per active question).

## Active Posting & Voting
### Workflow
1.  **Transition**: At `Interval_Start`, the top question from the Pool is locked and moved to "Active".
2.  **Notification**: Users are notified of the new Top-Five challenge.
3.  **Voting Phase**: The question is live for the specified **Voting Duration** (e.g., 24 hours).
4.  **Closing Period**:
    *   **Final Hour**: The last hour of the voting duration is designated as the "Closing Period".
    *   **Purpose**: Allows for last-minute votes and final deliberation.
    *   **Lock**: At the exact end of the Closing Period, voting is disabled immediately.

### Display & Voting
*   **UI**: Prominently displays the question and 5 clickable answer buttons.
*   **Mechanism**: Users select one answer.
*   **Blind Voting**: Vote counts are hidden until the user votes (or until the interval ends) to prevent bias/bandwagoning.

### Finalization Rules
*   **Consensus**: The answer with the plurality (or majority, configurable) of votes is deemed the "Community Truth".
*   **Quorum**: A minimum number of votes is required for the result to be valid.
*   **Weighting**:
    *   *Standard*: 1 Account = 1 Vote.
    *   *Weighted*: Votes weighted by Reputation Score (optional, for expert consensus).

## Result Logging
### Storage
*   **Governance Logs**: Final results are committed to the NeuroSwarm governance log.
*   **Data Structure**:
    ```json
    {
      "intervalId": 1024,
      "questionId": "q_8823",
      "winningOption": 3,
      "totalVotes": 450,
      "distribution": [10, 25, 350, 40, 25],
      "timestamp": "2025-11-24T12:00:00Z"
    }
    ```

### Transparency
*   **Auditability**: Anyone can verify the vote distribution and winning outcome via the Governance Explorer.
*   **History**: A permanent archive of all past Top-Five questions and winners.

## UI/UX Design
### Dashboard Tabs
1.  **Active Question**:
    *   Large typography for the question.
    *   5 distinct, clickable option cards.
    *   Countdown timer to next interval.
2.  **Question Pool**:
    *   List view of candidate questions.
    *   Upvote/Downvote controls.
    *   "Submit New" floating action button.
3.  **Interval Settings**:
    *   Current Interval status.
    *   Charts showing participation trends.

### Visualizations
*   **Bar Charts**: Post-vote distribution of answers.
*   **Timelines**: Line chart showing "Votes per Interval" over time.
*   **Leaderboards**: Top contributors (Question Submitters and Correct Voters).

### Notifications
*   **Tray Integration**: Desktop alerts when a new question is active.
*   **In-App**: Notification badge on the "Top-Five" nav item.

## Safeguards
### Sybil Resistance
*   **Identity**: Integration with NeuroSwarm Identity (DID) or minimum token balance requirements.
*   **Cost**: Small interaction costs (gas/fees) to make botting expensive.

### Reputation & Limits
*   **Weighting**: Reputation acts as a multiplier for rewards, encouraging long-term honest behavior.
*   **Limits**: Strict 1-vote-per-account rule for the Active Question.

### Guidelines
*   **Quality Standards**: Questions must be objective or have a clear community-consensus answer.
*   **Ambiguity**: Questions found to be ambiguous can be voided by Moderators, refunding all participants.

## Roadmap (Phase 16)
### Milestones
1.  **Question Pool Backend**: Develop submission, storage, and upvoting logic.
2.  **Interval Engine**: Implement the scheduler for transitioning questions from Pool to Active.
3.  **Active Posting UI**: Build the voting interface and countdown timers.
4.  **Dashboard Integration**: Create the full 3-tab layout and visualizations.
5.  **Governance Hook**: Connect final results to the immutable log.

### Testing & Rollout
*   **Unit Testing**: Verify voting logic, interval transitions, and reputation calculations.
*   **Beta**: "Testnet" launch with a small group to seed the question pool.
*   **Launch**: Public rollout with a "Daily" interval, monitoring for spam and engagement.
