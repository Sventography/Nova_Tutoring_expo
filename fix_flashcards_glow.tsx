  {!!topic && !searchOpen && (
    <View style={sx.cardWrap}>
      <LinearGlow borderColor={COLORS[topic.group as keyof typeof COLORS] ?? "#00e5ff"}>
        <View style={sx.cardHeader}>
          <Text style={sx.cardLabel}>Question</Text>
          <Pressable onPress={() => addCardToCollection()} hitSlop={10}>
