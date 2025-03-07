import { LoadingButton } from "@mui/lab";
import {
  Divider,
  Container,
  Card,
  CardContent,
  Stack,
  Typography,
  Box,
  Chip,
  Grid,
  Fade,
  Zoom,
  Tooltip,
  IconButton,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  useCurrentAddress,
  SessionKeyGuard,
  useRoochClient,
} from "@roochnetwork/rooch-sdk-kit";
import { useState, useEffect } from "react";
import { Raffle } from "../components/raffle";
import { styled } from "@mui/material/styles";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";
import { Layout } from "../uicomponents/shared/layout";
import { formatBalance, getCoinDecimals } from "../utils/coinUtils";
import { FATETYPE } from "../config/constants";

// 定义 props 类型
interface RaffleMessageMessageProps {
  type: "success" | "error";
}

// Custom card style
const StyledCard = styled(Card)`
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.9);

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  }
`;

// Custom button style
const StyledButton = styled(LoadingButton)`
  border-radius: 50px;
  padding: 12px 32px;
  font-weight: bold;
  text-transform: none;
  font-size: 1rem;
  transition: transform 0.2s ease;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }
`;

// 创建 styled 组件
const RaffleMessage = styled(Box)<RaffleMessageMessageProps>(({ type }) => ({
  position: "fixed",
  top: "20px",
  left: "20px",
  backgroundColor: type === "success" ? "rgba(46, 125, 50, 0.95)" : "rgba(211, 47, 47, 0.95)",
  color: "white",
  borderRadius: "12px",
  padding: "1.5rem",
  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
  zIndex: 1000,
  textAlign: "center",
  width: "90%",
  maxWidth: "300px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
}));

// Shine animation for the prize chip
const shineAnimation = keyframes`
  0% {
    background-position: -100px;
  }
  40% {
    background-position: 200px;
  }
  100% {
    background-position: 200px;
  }
`;

const ShiningChip = styled(Chip)`
  position: relative;
  overflow: hidden;
  &::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: rotate(30deg);
    animation: ${shineAnimation} 2s infinite;
  }
`;

function RafflePage() {
  const currentAddress = useCurrentAddress();
  const [loading, setLoading] = useState(false);
  const [raffleConfig, setRaffleConfig] = useState<any>(null);
  const [raffleRecord, setRaffleRecord] = useState<any>(null);
  const [fateBalance, setFateBalance] = useState<string>("0");
  const [showConfetti, setShowConfetti] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [messageText, setMessageText] = useState("");
  const [prizeDetails, setPrizeDetails] = useState<{
    name: string;
    duration: number;
  } | null>(null);
  const { width, height } = useWindowSize();
  const client = useRoochClient();

  const {
    GetCheckInRaffleByFate,
    ClaimMaxRaffle,
    QueryCheckInRaffle,
    QueryCheckInRaffleRecord,
  } = Raffle();

  // Fetch data on address change
  useEffect(() => {
    if (currentAddress && client) {
      fetchData();
      fetchFateBalance();
    }
  }, [currentAddress]);

  // Auto-close message after 3 seconds
  useEffect(() => {
    if (messageOpen) {
      const timer = setTimeout(() => {
        setMessageOpen(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [messageOpen]);

  const fetchData = async () => {
    try {
      const raffleConfigData = await QueryCheckInRaffle();
      setRaffleConfig(raffleConfigData);
      // console.log("奖池配置:", raffleConfigData);

      const raffleRecordData = await QueryCheckInRaffleRecord();
      // console.log("抽奖记录:", raffleRecordData);
      setRaffleRecord(raffleRecordData);
    } catch (error) {
      // console.error("获取数据失败:", error);
    }
  };

  const fetchFateBalance = async () => {
    if (!currentAddress || !client) return;

    try {
      // console.log("开始获取余额...");
      const decimals = await getCoinDecimals(client, FATETYPE);
      // console.log("获取到 decimals:", decimals);

      const balance = (await client.getBalance({
        owner: currentAddress?.genRoochAddress().toHexAddress() || "",
        coinType: FATETYPE,
      })) as any;
      // console.log("原始余额数据:", balance);

      if (!balance?.balance) {
        // console.warn("余额返回值异常:", balance);
        setFateBalance("0");
        return;
      }
      const formattedBalance = formatBalance(balance.balance, decimals);
      // console.log("格式化后的余额:", formattedBalance);
      setFateBalance(formattedBalance);
    } catch (error) {
      // console.error("获取 FATE 余额失败:", error);
      setFateBalance("0");
    }
  };

  const getPrizeLevel = (result: number, config: any) => {
    if (!result || !config) return null;

    const resultNum = Number(result);
    const grandWeight = Number(config.grand_prize_weight);
    const secondWeight = Number(config.second_prize_weight);
    const thirdWeight = Number(config.third_prize_weight);

    const totalWeight = grandWeight + secondWeight + thirdWeight;
    const normalizedResult =
      (resultNum / Number(config.max_raffle_count_weight)) * totalWeight;

    if (normalizedResult <= grandWeight) {
      return {
        level: 1,
        name: "First Prize",
        duration: Number(config.grand_prize_duration),
      };
    } else if (normalizedResult <= grandWeight + secondWeight) {
      return {
        level: 2,
        name: "Second Prize",
        duration: Number(config.second_prize_duration),
      };
    } else {
      return {
        level: 3,
        name: "Third Prize",
        duration: Number(config.third_prize_duration),
      };
    }
  };

  const handleFateRaffle = async () => {
    if (loading) return;

    if (parseInt(raffleRecord?.raffle_count || "0") >= 50) {
      setMessageType("error");
      setMessageText("The maximum raffle limit (50 times) has been reached.");
      setPrizeDetails(null);
      setMessageOpen(true);
      return;
    }

    setLoading(true);
    try {
      const result = await GetCheckInRaffleByFate();
      // console.log("Fate抽奖结果:", result);

      if (result === undefined) {
        setMessageType("error");
        setMessageText("Insufficient FATE balance or raffle limit has been reached.");
        setPrizeDetails(null);
        setMessageOpen(true);
        return;
      }

      const prizeLevel = getPrizeLevel(Number(result), raffleConfig);

      if (prizeLevel) {
        setMessageType("success");
        setMessageText(`Congratulations on winning ${prizeLevel.name}!`);
        setPrizeDetails({ name: prizeLevel.name, duration: prizeLevel.duration });
        setMessageOpen(true);
        setShowConfetti(true);
      }
      await fetchData();
    } catch (error) {
      // console.error("Fate抽奖失败:", error);
      setMessageType("error");
      setMessageText("Raffle failed, please try again.");
      setPrizeDetails(null);
      setMessageOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimMaxRaffle = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await ClaimMaxRaffle();
      await fetchData();
      setMessageType("success");
      setMessageText("Reward claimed successfully, got 1000 $FATE"); // 设置具体的成功消息
      setPrizeDetails(null); // 保底奖励不需要 prizeDetails
      setMessageOpen(true);
    } catch (error) {
      // console.error("领取保底失败:", error);
      setMessageType("error");
      setMessageText("Claim failed, please try again.");
      setPrizeDetails(null);
      setMessageOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container className="app-container">
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.1}
            onConfettiComplete={() => setShowConfetti(false)}
          />
        )}

        {messageOpen && (
          <RaffleMessage type={messageType}>
            {messageType === "success" && prizeDetails && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <EmojiEventsIcon sx={{ fontSize: "4rem", color: "white" }} />
                </motion.div>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
                  {messageText}
                </Typography>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Winning{" "}
                  <ShiningChip
                    label={`${prizeDetails.duration} $FATE`}
                    sx={{ fontWeight: "bold", fontSize: "1rem", color: "white" }}
                  />
                </Typography>
              </>
            )}
            {messageType === "error" && (
              <>
                <ErrorOutlineIcon sx={{ fontSize: "3rem", color: "white", mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {messageText}
                </Typography>
              </>
            )}
            {messageType === "success" && !prizeDetails && (
              <>
                <CheckCircleOutlineIcon sx={{ fontSize: "3rem", color: "white", mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  {messageText} {/* 显示“领取成功，获得 1000 FATE” */}
                </Typography>
              </>
            )}
          </RaffleMessage>
        )}

        <Stack
          className="font-sans min-w-[1024px]"
          direction="column"
          sx={{
            minHeight: "100vh",
            padding: "2rem",
          }}
        >
          <Stack
            direction="row"
            justifyContent="center"
            alignItems="center"
            className="mb-8"
          >
            <Typography variant="h4" className="font-bold">
            Raffle Event
            </Typography>
            <Box width={100} />
          </Stack>

          <Grid container spacing={4}>
            {/* Raffle Status Card */}
            <Grid item xs={12} md={6}>
              <StyledCard elevation={3} className="mb-8">
                <CardContent>
                  <Typography
                    variant="h5"
                    className="mb-4 font-bold"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Box component="span" sx={{ mr: 1, fontSize: "1.5rem" }}>
                      🎲
                    </Box>
                    Your Raffle Details
                    </Typography>
                    <br/>

                  {raffleRecord ? (
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography>Today's Raffle Attempts:</Typography>
                          <Tooltip
                            title="The daily raffle limit is 50 times, and the count resets after the first raffle of the next day."
                            arrow
                            placement="top"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Zoom in={true} style={{ transitionDelay: "100ms" }}>
                          <Chip
                            label={raffleRecord?.daily_raffle_count || 0}
                            color="secondary"
                            sx={{ fontWeight: "bold" }}
                          />
                        </Zoom>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography>Total Unclaimed Guarantee Attempts:</Typography>
                          <Tooltip
                            title="Every 10 accumulated raffle attempts allow you to claim one guaranteed reward, and this count decreases by 10 after claiming."
                            arrow
                            placement="top"
                          >
                            <IconButton size="small" sx={{ ml: 1 }}>
                              <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Zoom in={true} style={{ transitionDelay: "200ms" }}>
                          <Chip
                            label={raffleRecord?.raffle_count || 0}
                            color="primary"
                            sx={{ fontWeight: "bold" }}
                          />
                        </Zoom>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Remaining for Next Guarantee:</Typography>
                        <Zoom in={true} style={{ transitionDelay: "300ms" }}>
                          <Chip
                            label={
                              (raffleRecord?.raffle_count || 0) % 10 === 0
                                ? 10
                                : 10 - ((raffleRecord?.raffle_count || 0) % 10)
                            }
                            color="warning"
                            sx={{ fontWeight: "bold" }}
                          />
                        </Zoom>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography>No raffle information found, please start by participating in a raffle.</Typography>
                  )}
                </CardContent>
              </StyledCard>
            </Grid>

            {/* Raffle Pool Card */}
            <Grid item xs={12} md={6}>
              <StyledCard elevation={3} className="mb-8">
                <CardContent>
                  <Typography
                    variant="h5"
                    className="mb-4 font-bold"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Box component="span" sx={{ mr: 1, fontSize: "1.5rem" }}>
                      🏆
                    </Box>
                    Prize Pool Info
                  </Typography>
                  {raffleConfig ? (
                    <Stack spacing={2}>
                      <Typography
                        variant="subtitle1"
                        className="mb-2 font-bold"
                      >
                        Prize Settings:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>First Prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.grand_prize_duration?.toString() || "0"} FATE`}
                          color="primary"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Second Prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.second_prize_duration?.toString() || "0"} FATE`}
                          color="success"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Third Prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.third_prize_duration?.toString() || "0"} FATE`}
                          color="secondary"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Typography
                        variant="subtitle1"
                        className="mb-2 font-bold"
                      >
                        Probability of Win:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Probability of first Prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.grand_prize_weight?.toString() || "0"}%`}
                          color="primary"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Probability of second prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.second_prize_weight?.toString() || "0"}%`}
                          color="success"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography>Probability of third prize:</Typography>
                        <Chip
                          label={`${raffleConfig?.third_prize_weight?.toString() || "0"}%`}
                          color="secondary"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Box>
                    </Stack>
                  ) : (
                    <Typography>--</Typography>
                  )}
                </CardContent>
              </StyledCard>
            </Grid>
          </Grid>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            className="mt-4"
            style={{ marginTop: "30px" }}
          >
            <SessionKeyGuard onClick={handleFateRaffle}>
              <StyledButton
                variant="contained"
                color="secondary"
                size="large"
                loading={loading}
                startIcon={<span>✨</span>}
              >
                Raffle
              </StyledButton>
            </SessionKeyGuard>

            <SessionKeyGuard onClick={handleClaimMaxRaffle}>
              <StyledButton
                variant="outlined"
                color="success"
                size="large"
                loading={loading}
                disabled={parseInt(raffleRecord?.raffle_count || "0") < 10}
                startIcon={<span>🏅</span>}
              >
                Claim Guaranteed
              </StyledButton>
            </SessionKeyGuard>
          </Stack>
          {raffleConfig && (
            <Fade in={true}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, textAlign: "center" }}
              >
                $FATE Balance: {fateBalance}
                <br />
                Raffle Fee:{" "}
                {(
                  (Number(raffleConfig?.grand_prize_duration || 1000) * 5 +
                    Number(raffleConfig?.second_prize_duration || 500) * 25 +
                    Number(raffleConfig?.third_prize_duration || 150) * 70) /
                  100
                ).toFixed(2)}{" "}
                $FATE
              </Typography>
            </Fade>
          )}
        </Stack>
      </Container>
    </Layout>
  );
}

export default RafflePage;