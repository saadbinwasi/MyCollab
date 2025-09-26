export default function BoardsView() {
  return (
    <div className="board-surface">
      <div className="board-scroller">
        <div className="board-list">
          <div className="board-list-title">Today</div>
          <div className="board-card">work on frontend</div>
          <div className="board-add">+ Add a card</div>
        </div>
        <div className="board-list">
          <div className="board-list-title">This Week</div>
          <div className="board-add">+ Add a card</div>
        </div>
        <div className="board-list">
          <div className="board-list-title">Later</div>
          <div className="board-add">+ Add a card</div>
        </div>
        <div className="board-list">
          <div className="board-list-title">doing</div>
          <div className="board-add">+ Add a card</div>
        </div>
      </div>
    </div>
  )
} 