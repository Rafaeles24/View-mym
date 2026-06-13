import styles from "./ui.module.css";

export default function CardFile({
  data,
  selected,
  onSelect
} : {
  data: any;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div 
      className={`${styles.uploadItem} ${selected && styles.selected}`}
      onClick={onSelect}
    >
      { data.file.type.startsWith("image") && (
        <img src={data.preview} alt={data.file.name} />
      )}
      { data.file.type.startsWith("video") && (
        <video src={data.preview} controls muted/>
      )}
    </div>
  )
}